import {NextResponse} from "next/server";
import {randomUUID} from "crypto";
import {runDueRecurringTasks} from "../../../../lib/operations-board";
import {processClientDecisionEvents} from "../../../../lib/workflow-engine";
import {syncGmailReplies} from "../../../../lib/communications";
import {recordSystemHealth} from "../../../../lib/system-health";
import {processDiscoveryAutomation} from "../../../../lib/discovery";

export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 const auth=req.headers.get("authorization")||"";
 if(!secret||auth!=="Bearer "+secret)
  return NextResponse.json({ran:false,error:"UNAUTHORIZED"},{status:401});
 const correlationId=randomUUID();
 const jobs=[
  ["recurring",()=>runDueRecurringTasks({actor:null,limit:200})],
  ["decisions",()=>processClientDecisionEvents({limit:100})],
  ["discovery",()=>processDiscoveryAutomation({limit:60})],
  ["gmail",()=>syncGmailReplies({limit:50})]
 ] as const;
 const settled=await Promise.allSettled(jobs.map(([,fn])=>fn()));
 const result:any={ran:true,correlationId};
 let failed=0;
 for(let i=0;i<jobs.length;i++){
  const name=jobs[i][0],x=settled[i];
  if(x.status==="fulfilled")result[name]=x.value;
  else{failed++;result[name]={ok:false,error:x.reason instanceof Error?x.reason.message:"JOB_FAILED"};}
 }
 try{await recordSystemHealth({component:"operations_cron",status:failed?"DEGRADED":"OK",correlationId,details:{failed,total:jobs.length,jobs:Object.fromEntries(jobs.map(([name],i)=>[name,settled[i].status]))}});}catch{}
 if(failed)console.error("WGOS_OPERATIONS_CRON_DEGRADED",JSON.stringify(result));
 else console.log("WGOS_OPERATIONS_CRON_OK",JSON.stringify(result));
 return NextResponse.json(result,{status:failed?500:200,headers:{"Cache-Control":"no-store, private"}});
}

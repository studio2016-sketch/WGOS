import {NextResponse} from "next/server";
import {randomUUID} from "crypto";
import {runDueRecurringTasks} from "../../../../lib/operations-board";
import {processClientDecisionEvents} from "../../../../lib/workflow-engine";
import {syncGmailReplies} from "../../../../lib/communications";
import {recordSystemHealth} from "../../../../lib/system-health";
import {observeOperationalExceptions} from "../../../../lib/automation-exception-watch";
import {observeDepositExceptions} from "../../../../lib/automation-financial-exceptions";
import {observeProjectDeadlines} from "../../../../lib/automation-deadline-watch";
import {processDiscoveryAutomation} from "../../../../lib/discovery";
import {ensureReadyDiscoveryProposalDrafts} from "../../../../lib/documents";

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
  ["proposalDrafts",()=>ensureReadyDiscoveryProposalDrafts({limit:20})],
  ["gmail",()=>syncGmailReplies({limit:50})],
  ...(process.env.WGOS_EXCEPTION_AUTOMATIONS_ENABLED==="true"
   ?[["exceptionWatch",()=>observeOperationalExceptions({limit:100})] as const]
   :[]),
  ...(process.env.WGOS_FINANCIAL_EXCEPTION_AUTOMATIONS_ENABLED==="true"
   ?[["depositReview",()=>observeDepositExceptions({limit:50})] as const]
   :[]),
  ...(process.env.WGOS_DEADLINE_AUTOMATIONS_ENABLED==="true"
   ?[["deadlineWatch",()=>observeProjectDeadlines({limit:50})] as const]
   :[])
 ] as const;
 const settled=await Promise.allSettled(jobs.map(([,fn])=>fn()));
 const result:any={ran:true,correlationId};
 let failed=0,partial=0,unconfigured=0;
 const jobOutcomes:Record<string,string>={};
 for(let i=0;i<jobs.length;i++){
  const name=jobs[i][0],x=settled[i];
  if(x.status==="fulfilled"){
   result[name]=x.value;const v:any=x.value;
   if(v?.configured===false){unconfigured++;jobOutcomes[name]="UNCONFIGURED";}
   else if(v?.ok===false||Number(v?.failed||0)>0||Number(v?.invalidRecipients||0)>0||(Array.isArray(v?.errors)?v.errors.length>0:Number(v?.errors||0)>0)){partial++;jobOutcomes[name]="DEGRADED";}
   else jobOutcomes[name]="OK";
  }else{failed++;jobOutcomes[name]="FAILED";result[name]={ok:false,error:x.reason instanceof Error?x.reason.message:"JOB_FAILED"};}
 }
 const healthStatus=(failed+partial+unconfigured)?"DEGRADED":"OK";
 result.health={status:healthStatus,failed,partial,unconfigured,jobOutcomes};
 let healthRecorded=true;
 try{await recordSystemHealth({component:"operations_cron",status:healthStatus,correlationId,details:{failed,partial,unconfigured,total:jobs.length,jobOutcomes,jobs:Object.fromEntries(jobs.map(([name],i)=>[name,settled[i].status]))}});}
 catch{healthRecorded=false;console.error("WGOS_OPERATIONS_HEALTH_WRITE_FAILED",JSON.stringify({correlationId}));}
 result.health.recorded=healthRecorded;
 if(!healthRecorded)result.health.status="DEGRADED";
 if(!healthRecorded||failed+partial+unconfigured)console.error("WGOS_OPERATIONS_CRON_DEGRADED",JSON.stringify(result));
 else console.log("WGOS_OPERATIONS_CRON_OK",JSON.stringify(result));
 return NextResponse.json(result,{status:failed?500:200,headers:{"Cache-Control":"no-store, private"}});
}

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
import {reportedJobFailures} from "../../../../lib/cron-failure-classifier";

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
 let rejectedJobs=0, nestedFailedJobs=0, nestedFailedAttempts=0;
 const jobStatuses:Record<string,string>={};
 for(let i=0;i<jobs.length;i++){
  const name=jobs[i][0],x=settled[i];
  if(x.status==="fulfilled"){
   result[name]=x.value;
   const nested=reportedJobFailures(x.value);
   if(nested>0){nestedFailedJobs++;nestedFailedAttempts+=nested;jobStatuses[name]="fulfilled_with_failures";}
   else jobStatuses[name]="fulfilled";
  }else{
   rejectedJobs++;
   jobStatuses[name]="rejected";
   result[name]={ok:false,error:x.reason instanceof Error?x.reason.message:"JOB_FAILED"};
  }
 }
 const degraded=rejectedJobs>0||nestedFailedJobs>0;
 result.health={status:degraded?"DEGRADED":"OK",rejectedJobs,nestedFailedJobs,nestedFailedAttempts};
 try{await recordSystemHealth({component:"operations_cron",status:degraded?"DEGRADED":"OK",correlationId,
  details:{rejectedJobs,nestedFailedJobs,nestedFailedAttempts,total:jobs.length,jobs:jobStatuses}});}catch{}
 if(degraded)console.error("WGOS_OPERATIONS_CRON_DEGRADED",JSON.stringify(result));
 else console.log("WGOS_OPERATIONS_CRON_OK",JSON.stringify(result));
 // Keep HTTP 200 for fulfilled jobs with nested failures until retry/idempotency safety is independently verified.
 // Rejected promises retain the previous HTTP 500 behavior.
 return NextResponse.json(result,{status:rejectedJobs?500:200,headers:{"Cache-Control":"no-store, private"}});
}

import {NextResponse} from "next/server";
import {randomUUID} from "crypto";
import {summarizeCronJobs} from "../../../../lib/cron-result-summary";
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
 if(process.env.WGOS_PAUSE_OPERATIONS_CRON==="true")
  return NextResponse.json({ran:false,status:"PAUSED",correlationId},{headers:{"Cache-Control":"no-store, private"}});
 const settled=await Promise.allSettled(jobs.map(([,fn])=>fn()));
 const summary=summarizeCronJobs(jobs.map(([name])=>name),settled);
 const failed=summary.filter(x=>x.status==="FAILED"||x.status==="QUOTA_EXCEEDED").length;
 const quotaExceeded=summary.some(x=>x.status==="QUOTA_EXCEEDED");
 const result={ran:true,correlationId,status:failed?"DEGRADED":"OK",jobs:summary};
 if(!quotaExceeded){
  try{await recordSystemHealth({component:"operations_cron",status:failed?"DEGRADED":"OK",
   correlationId,details:{failed,total:jobs.length,jobs:Object.fromEntries(summary.map(x=>[x.name,x.status]))}});}catch{}
 }
 if(failed)console.error("WGOS_OPERATIONS_CRON_DEGRADED",JSON.stringify(result));
 else console.log("WGOS_OPERATIONS_CRON_OK",JSON.stringify(result));
 return NextResponse.json(result,{status:failed?503:200,headers:{"Cache-Control":"no-store, private"}});
}

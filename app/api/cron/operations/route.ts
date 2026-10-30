import {NextResponse} from "next/server";
import {randomUUID} from "crypto";
import {runDueRecurringTasks} from "../../../../lib/operations-board";
import {processClientDecisionEvents} from "../../../../lib/workflow-engine";
import {syncGmailReplies} from "../../../../lib/communications";
import {recordSystemHealth} from "../../../../lib/system-health";
import {summarizeCronHealth} from "../../../../lib/cron-health-policy";
import {buildSafeCronResponse} from "../../../../lib/cron-response-policy";
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
 const failed=settled.filter(x=>x.status==="rejected").length;
 // A fulfilled job can still report per-item failures (e.g. discovery delivery).
 // Preserve the existing HTTP retry behavior while recording accurate health.
 const health=summarizeCronHealth(jobs.map(([name],i)=>({name,settlement:settled[i]})));
 try{await recordSystemHealth({component:"operations_cron",status:health.status,correlationId,details:{failed,reportedFailures:health.reportedFailures,total:jobs.length,jobs:health.jobs}});}catch{}
 // Log only counts and state labels, never raw job results or provider exceptions.
 const logSummary={correlationId,rejectedJobs:failed,reportedFailures:health.reportedFailures,jobs:health.jobs};
 if(health.status==="DEGRADED")console.error("WGOS_OPERATIONS_CRON_DEGRADED",JSON.stringify(logSummary));
 else console.log("WGOS_OPERATIONS_CRON_OK",JSON.stringify(logSummary));
 return NextResponse.json(buildSafeCronResponse(correlationId,health),{status:failed?500:200,headers:{"Cache-Control":"no-store, private"}});
}

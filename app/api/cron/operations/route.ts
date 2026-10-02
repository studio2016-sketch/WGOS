import {NextResponse} from "next/server";
import {runDueRecurringTasks} from "../../../../lib/operations-board";
import {processClientDecisionEvents} from "../../../../lib/workflow-engine";
import {syncGmailReplies} from "../../../../lib/communications";

export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 const auth=req.headers.get("authorization")||"";
 if(!secret||auth!=="Bearer "+secret)
  return NextResponse.json({ran:false,error:"UNAUTHORIZED"},{status:401});
 try{
  const [recurring,decisions,gmail]=await Promise.all([runDueRecurringTasks({actor:null,limit:200}),processClientDecisionEvents({limit:100}),syncGmailReplies({limit:50})]);
  return NextResponse.json({ran:true,recurring,decisions,gmail});
 }catch(e){
  return NextResponse.json({ran:false,error:e instanceof Error?e.message:"Recurring work execution failed"},{status:500});
 }
}

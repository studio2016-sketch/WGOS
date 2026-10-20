import {NextResponse} from "next/server";
import {requireApiUser,requireApiProject} from "../../../../../lib/authz";
import {runDueRecurringTasks} from "../../../../../lib/operations-board";

export async function POST(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({ran:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json().catch(()=>({}));
  const projectId=body.projectId?String(body.projectId):null;
  const isGlobal=["OWNER","ADMIN"].includes(String((auth.identity as any).role||""));
  if(!isGlobal&&!projectId)return NextResponse.json({ran:false,error:"PROJECT_REQUIRED"},{status:400});
  if(projectId){
   const access=await requireApiProject(auth.identity,projectId);
   if(!access.ok)return NextResponse.json({ran:false,error:access.error},{status:access.status});
  }
  const result=await runDueRecurringTasks({
   projectId,
   actor:String((auth.identity as any).auth_user_id),
   limit:100
  });
  return NextResponse.json({ran:true,...result});
 }catch(e){
  return NextResponse.json({ran:false,error:e instanceof Error?e.message:"Unable to run recurring rules"},{status:400});
 }
}
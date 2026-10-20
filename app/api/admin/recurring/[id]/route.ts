import {NextResponse} from "next/server";
import {requireApiUser,requireApiProject} from "../../../../../lib/authz";
import {updateRecurringTaskRule} from "../../../../../lib/operations-board";
import {db} from "../../../../../lib/db";

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const sql=db();
  const scope:any[]=await sql`SELECT project_id FROM wgos.recurring_task_rules WHERE id=${id}::uuid LIMIT 1`;
  const projectId=String(scope[0]?.project_id||"");
  if(!projectId)return NextResponse.json({updated:false,error:"RECURRING_RULE_NOT_FOUND"},{status:404});
  const access=await requireApiProject(auth.identity,projectId);
  if(!access.ok)return NextResponse.json({updated:false,error:access.error},{status:access.status});
  const body=await req.json();
  const rule:any=await updateRecurringTaskRule({
   ruleId:id,
   name:String(body.name||""),
   title:String(body.title||""),
   description:body.description?String(body.description):null,
   groupName:body.groupName?String(body.groupName):"General",
   priority:String(body.priority||"MEDIUM"),
   assigneeSubject:body.assigneeSubject?String(body.assigneeSubject):null,
   cadence:String(body.cadence||"WEEKLY"),
   intervalCount:Number(body.intervalCount||1),
   nextRunAt:String(body.nextRunAt||""),
   timezone:String(body.timezone||"America/Chicago"),
   requiresApproval:Boolean(body.requiresApproval),
   approvalRole:body.approvalRole?String(body.approvalRole):null,
   enabled:Boolean(body.enabled),
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({updated:true,rule});
 }catch(e){
  return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update recurring rule"},{status:400});
 }
}
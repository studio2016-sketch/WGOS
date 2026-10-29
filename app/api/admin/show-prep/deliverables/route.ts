import {NextResponse} from "next/server";
import {requireApiBrandAdmin,requireApiUser} from "../../../../../lib/authz";
import {db} from "../../../../../lib/db";

const allowedStatuses=["OPEN","IN_PROGRESS","WAITING","BLOCKED","DONE"];
const asNullable=(value:any)=>value===undefined||value===null||value===""?null:String(value);

async function authorizedEvent(identity:any,eventId:string){
 const sql=db();
 const rows=await sql`SELECT id,brand_id FROM wgos.production_events WHERE id=${eventId}::uuid LIMIT 1`;
 const event:any=rows[0];
 if(!event)return {ok:false as const,status:404,error:"SHOW_NOT_FOUND"};
 const access=await requireApiBrandAdmin(identity,String(event.brand_id));
 return access.ok?{ok:true as const,event}:{...access};
}

export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try{
  const body=await req.json();const eventId=String(body.productionEventId||"");
  if(!eventId)return NextResponse.json({error:"SHOW_REQUIRED"},{status:400});
  const scope=await authorizedEvent(auth.identity,eventId);if(!scope.ok)return NextResponse.json({error:scope.error},{status:scope.status});
  const title=String(body.checkpoint||"").trim();if(!title)return NextResponse.json({error:"DELIVERABLE_TITLE_REQUIRED"},{status:400});
  const status="OPEN";const sql=db();
  const owner=asNullable(body.ownerSubject);
  if(owner){const rows=await sql`SELECT 1 FROM wgos.app_users WHERE auth_user_id=${owner} AND active=true LIMIT 1`;if(!rows[0])return NextResponse.json({error:"OWNER_MUST_BE_ACTIVE_USER"},{status:400});}
  const rows=await sql`INSERT INTO wgos.advancing_checkpoints(production_event_id,checkpoint,owner_subject,due_at,status,notes)
   VALUES(${eventId}::uuid,${title},${owner},${asNullable(body.dueAt)},${status},${asNullable(body.notes)})
   RETURNING id,production_event_id,checkpoint,owner_subject,due_at,status,notes`;
  return NextResponse.json({created:true,deliverable:rows[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to add deliverable"},{status:400});}
}

export async function PATCH(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try{
  const body=await req.json();const id=String(body.id||"");if(!id)return NextResponse.json({error:"DELIVERABLE_REQUIRED"},{status:400});
  const sql=db();const rows=await sql`SELECT c.id,c.production_event_id,e.brand_id FROM wgos.advancing_checkpoints c JOIN wgos.production_events e ON e.id=c.production_event_id WHERE c.id=${id}::uuid LIMIT 1`;
  const item:any=rows[0];if(!item)return NextResponse.json({error:"DELIVERABLE_NOT_FOUND"},{status:404});
  const access=await requireApiBrandAdmin(auth.identity,String(item.brand_id));if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  const checkpoint=String(body.checkpoint||"").trim();if(!checkpoint)return NextResponse.json({error:"DELIVERABLE_TITLE_REQUIRED"},{status:400});
  const status=String(body.status||"OPEN");if(!allowedStatuses.includes(status))return NextResponse.json({error:"INVALID_STATUS"},{status:400});
  const owner=asNullable(body.owner_subject);if(owner){const active=await sql`SELECT 1 FROM wgos.app_users WHERE auth_user_id=${owner} AND active=true LIMIT 1`;if(!active[0])return NextResponse.json({error:"OWNER_MUST_BE_ACTIVE_USER"},{status:400});}
  const updated=await sql`UPDATE wgos.advancing_checkpoints SET checkpoint=${checkpoint},owner_subject=${owner},due_at=${asNullable(body.due_at)},status=${status},notes=${asNullable(body.notes)},completed_at=CASE WHEN ${status}='DONE' THEN COALESCE(completed_at,now()) ELSE NULL END WHERE id=${id}::uuid RETURNING id,production_event_id,checkpoint,owner_subject,due_at,status,notes`;
  return NextResponse.json({updated:true,deliverable:updated[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to save deliverable"},{status:400});}
}

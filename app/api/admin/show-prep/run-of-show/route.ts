import {NextResponse} from "next/server";
import {requireApiBrandAdmin,requireApiUser} from "../../../../../lib/authz";
import {db} from "../../../../../lib/db";

const states=["PLANNED","READY","IN_PROGRESS","COMPLETE","CANCELLED"];
const nullable=(v:any)=>v===undefined||v===null||v===""?null:String(v);

async function activeOwner(sql:any,subject:any){
 if(!subject)return true;
 const rows=await sql`SELECT 1 FROM wgos.app_users WHERE auth_user_id=${String(subject)} AND active=true LIMIT 1`;
 return Boolean(rows[0]);
}

export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try{
  const body=await req.json();const eventId=String(body.productionEventId||"");if(!eventId)return NextResponse.json({error:"SHOW_REQUIRED"},{status:400});
  const sql=db();const events=await sql`SELECT id,brand_id FROM wgos.production_events WHERE id=${eventId}::uuid LIMIT 1`;const event:any=events[0];if(!event)return NextResponse.json({error:"SHOW_NOT_FOUND"},{status:404});
  const access=await requireApiBrandAdmin(auth.identity,String(event.brand_id));if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  const title=String(body.title||"").trim();if(!title)return NextResponse.json({error:"CUE_TITLE_REQUIRED"},{status:400});
  if(!await activeOwner(sql,body.ownerSubject))return NextResponse.json({error:"OWNER_MUST_BE_ACTIVE_USER"},{status:400});
  const pos=await sql`SELECT COALESCE(max(position),0)::int+10 AS next_position FROM wgos.run_of_show_items WHERE production_event_id=${eventId}::uuid`;
  const rows=await sql`INSERT INTO wgos.run_of_show_items(production_event_id,position,cue_at,duration_seconds,title,department,owner_subject,notes,status)
   VALUES(${eventId}::uuid,${Number(body.position||pos[0]?.next_position||10)},${nullable(body.cueAt)},${body.durationSeconds?Number(body.durationSeconds):null},${title},${nullable(body.department)},${nullable(body.ownerSubject)},${nullable(body.notes)},'PLANNED')
   RETURNING id,production_event_id,position,cue_at,duration_seconds,title,department,owner_subject,notes,status`;
  return NextResponse.json({created:true,item:rows[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to add schedule cue"},{status:400});}
}

export async function PATCH(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try{
  const body=await req.json();const id=String(body.id||"");if(!id)return NextResponse.json({error:"CUE_REQUIRED"},{status:400});
  const sql=db();const found=await sql`SELECT r.id,e.brand_id FROM wgos.run_of_show_items r JOIN wgos.production_events e ON e.id=r.production_event_id WHERE r.id=${id}::uuid LIMIT 1`;const cue:any=found[0];if(!cue)return NextResponse.json({error:"CUE_NOT_FOUND"},{status:404});
  const access=await requireApiBrandAdmin(auth.identity,String(cue.brand_id));if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  const title=String(body.title||"").trim();const status=String(body.status||"PLANNED");if(!title)return NextResponse.json({error:"CUE_TITLE_REQUIRED"},{status:400});if(!states.includes(status))return NextResponse.json({error:"INVALID_STATUS"},{status:400});
  if(!await activeOwner(sql,body.owner_subject))return NextResponse.json({error:"OWNER_MUST_BE_ACTIVE_USER"},{status:400});
  const rows=await sql`UPDATE wgos.run_of_show_items SET position=${Number(body.position||0)},cue_at=${nullable(body.cue_at)},duration_seconds=${body.duration_seconds?Number(body.duration_seconds):null},title=${title},department=${nullable(body.department)},owner_subject=${nullable(body.owner_subject)},notes=${nullable(body.notes)},status=${status} WHERE id=${id}::uuid RETURNING id,production_event_id,position,cue_at,duration_seconds,title,department,owner_subject,notes,status`;
  return NextResponse.json({updated:true,item:rows[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to save schedule cue"},{status:400});}
}

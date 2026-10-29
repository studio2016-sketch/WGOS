import {NextResponse} from "next/server";
import {requireApiBrandAdmin,requireApiUser} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {createOperationsProject} from "../../../../lib/operations-board";
import {showPrepTemplate} from "../../../../lib/show-prep-template";

function checkpointDue(timing:string,eventStart:string|null){
 if(!eventStart)return null;
 const offsets:Record<string,number>={"At confirmation":-56,"Before announce":-49,"As soon as contacts are available":-42,"8–6 weeks out":-49,"6–4 weeks out":-35,"4–2 weeks out":-21,"2 weeks out":-14,"1 week out":-7,"72 hours out":-3,"24 hours out":-1,"Before crew call":0,"Load-in":0,"Load-in / soundcheck":0,"Before doors":0,"During event":0,"After performance":0,"After show":1,"Within 1 business day":1,"Within 2 business days":2};
 const date=new Date(eventStart);date.setDate(date.getDate()+(offsets[timing]??-7));return date.toISOString();
}

export async function POST(req:Request){
 const auth=await requireApiUser(); if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try{
  const body=await req.json(); const brandId=String(body.brandId||"");
  const access=await requireApiBrandAdmin(auth.identity,brandId); if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  const name=String(body.eventName||"").trim(); if(!name)throw new Error("Show name is required.");
  const project=await createOperationsProject({brandId,title:name,startAt:body.eventStart||null,endAt:body.eventEnd||null,actor:String(auth.identity.auth_user_id)});
  const sql=db();
  const rows=await sql`INSERT INTO wgos.production_events(project_id,brand_id,event_name,venue_name,event_start,event_end,load_in_at,doors_at,timezone,status)
   VALUES(${project.id}::uuid,${brandId},${name},${String(body.venueName||"")||null},${body.eventStart||null},${body.eventEnd||null},${body.loadInAt||null},${body.doorsAt||null},${String(body.timezone||"America/Chicago")},'ADVANCING') RETURNING *`;
  const event:any=rows[0];
  for(const item of showPrepTemplate){
   await sql`INSERT INTO wgos.advancing_checkpoints(production_event_id,checkpoint,due_at,status,notes)
    VALUES(${event.id}::uuid,${item.checkpoint},${checkpointDue(item.timing,body.eventStart||null)},'OPEN',${item.phase+" · "+item.handoff})`;
  }
  const deliverables=await sql`SELECT id,production_event_id,checkpoint,owner_subject,due_at,status,notes FROM wgos.advancing_checkpoints WHERE production_event_id=${event.id}::uuid ORDER BY due_at NULLS LAST,checkpoint`;
  return NextResponse.json({created:true,event,deliverables});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create show"},{status:400});}
}

import {NextResponse} from "next/server";
import {requireApiBrandAdmin,requireApiUser} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {createHash,randomUUID} from "node:crypto";
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
  const sql=db();
  const actor=String(auth.identity.auth_user_id);
  const key=String(body.requestId||randomUUID());
  const projectId=createHash("sha256").update(JSON.stringify([brandId,actor,key])).digest("hex").slice(0,32);
  const start=body.eventStart||null,end=body.eventEnd||null;
  if(end && (!start || Date.parse(end)<=Date.parse(start)))throw new Error("Show end must follow its start.");
  const checkpoints=showPrepTemplate.map(item=>({checkpoint:item.checkpoint,due_at:checkpointDue(item.timing,start),notes:item.phase+" · "+item.handoff}));
  const existing=await sql`SELECT id FROM wgos.production_events WHERE project_id=${projectId}::uuid AND brand_id=${brandId}`;
  if(!existing.length && start && !body.acceptOverlap && await overlaps(brandId,start,end,null)){
   return NextResponse.json({overlap:true,error:"Another event overlaps this time."},{status:409});
  }
  const [,events,deliverables]=await sql.transaction([
   sql`WITH project AS (
    INSERT INTO wgos.projects(id,brand_id,title,status,start_at,end_at) VALUES(${projectId}::uuid,${brandId},${name},'PLANNING',${start},${end})
    ON CONFLICT(id) DO NOTHING RETURNING id
   ), show AS (
    INSERT INTO wgos.production_events(project_id,brand_id,event_name,venue_name,event_start,event_end,load_in_at,doors_at,timezone,status)
    SELECT id,${brandId},${name},${body.venueName||null},${start}::timestamptz,${end}::timestamptz,${body.loadInAt||null}::timestamptz,${body.doorsAt||null}::timestamptz,${body.timezone||"America/Chicago"},'ADVANCING' FROM project RETURNING id
   ), audit AS (
    INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
    SELECT ${actor},'PROJECT_CREATED','PROJECT',id::text,jsonb_build_object('brand',${brandId}::text,'source','SHOW_PREP') FROM project
   ) INSERT INTO wgos.advancing_checkpoints(production_event_id,checkpoint,due_at,status,notes)
    SELECT show.id,c.checkpoint,c.due_at,'OPEN',c.notes FROM show CROSS JOIN jsonb_to_recordset(${JSON.stringify(checkpoints)}::jsonb) c(checkpoint text,due_at timestamptz,notes text)`,
   sql`SELECT * FROM wgos.production_events WHERE project_id=${projectId}::uuid AND brand_id=${brandId}`,
   sql`SELECT c.* FROM wgos.advancing_checkpoints c JOIN wgos.production_events e ON e.id=c.production_event_id WHERE e.project_id=${projectId}::uuid ORDER BY c.due_at NULLS LAST,c.checkpoint`
  ]);
  const event=events[0];
  if(!event)throw new Error("Unable to locate saved show.");
  return NextResponse.json({created:true,event,deliverables});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to create show"},{status:400});}
}

async function overlaps(brand:string,start:string,end:string|null,skip:string|null){
 const rows=await db()`SELECT 1 FROM (
  SELECT event_start AS starts,event_end AS ends FROM wgos.production_events WHERE brand_id=${brand} AND id IS DISTINCT FROM ${skip}::uuid AND status<>'CANCELLED'
  UNION ALL SELECT start_at,end_at FROM wgos.calendar_events WHERE brand_id=${brand} AND status='SCHEDULED'
 ) schedule WHERE starts IS NOT NULL AND (starts,COALESCE(ends,starts)) OVERLAPS (${start}::timestamptz,COALESCE(${end}::timestamptz,${start}::timestamptz)) LIMIT 1`;
 return rows.length>0;
}

export async function PATCH(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try{
  const {brandId,id,eventStart,eventEnd,previousStart,acceptOverlap}=await req.json();
  const access=await requireApiBrandAdmin(auth.identity,brandId);
  if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  if(!Number.isFinite(Date.parse(eventStart)) || (eventEnd && !(Date.parse(eventEnd)>Date.parse(eventStart))))throw new Error("Enter a valid show window.");
  if(!acceptOverlap && await overlaps(brandId,eventStart,eventEnd||null,id))return NextResponse.json({overlap:true,error:"Another event overlaps this time."},{status:409});
  const rows=await db()`WITH moved AS (
   UPDATE wgos.production_events SET event_start=${eventStart},event_end=${eventEnd||null} WHERE id=${id}::uuid AND brand_id=${brandId} AND event_start IS NOT DISTINCT FROM ${previousStart}::timestamptz RETURNING *
  ), project AS (
   UPDATE wgos.projects p SET start_at=m.event_start,end_at=m.event_end FROM moved m WHERE p.id=m.project_id AND p.brand_id=m.brand_id
  ), audit AS (
   INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) SELECT ${String(auth.identity.auth_user_id)},'SHOW_RESCHEDULED','production_event',id::text,jsonb_build_object('eventStart',event_start) FROM moved
  ) SELECT * FROM moved`;
  if(!rows.length)return NextResponse.json({error:"Show changed. Refresh before rescheduling."},{status:409});
  return NextResponse.json({event:rows[0]});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to reschedule."},{status:400});}
}

import "server-only";
import {db} from "./db";
import {createGoogleCalendarEvent,cancelGoogleCalendarEvent} from "./google-workspace";

const statuses=["SCHEDULED","COMPLETE","CANCELLED"] as const;
function validStatus(v:string){if(!statuses.includes(v as any))throw new Error("Invalid calendar status.");return v as typeof statuses[number];}

export async function listCalendarEvents(brandId?:string){
 const sql=db();
 return brandId?sql`SELECT e.*,b.name brand_name,p.title project_title FROM wgos.calendar_events e JOIN wgos.brands b ON b.id=e.brand_id LEFT JOIN wgos.projects p ON p.id=e.project_id WHERE e.brand_id=${brandId} ORDER BY e.start_at`
 :sql`SELECT e.*,b.name brand_name,p.title project_title FROM wgos.calendar_events e JOIN wgos.brands b ON b.id=e.brand_id LEFT JOIN wgos.projects p ON p.id=e.project_id ORDER BY e.start_at`;
}
export async function createCalendarEvent(input:{brandId:string;projectId?:string|null;title:string;startAt:string;endAt:string;timezone:string;actor:string}){
 const sql=db(),title=input.title.trim(),timezone=input.timezone.trim()||"UTC";
 if(!title)throw new Error("Event title is required.");
 const start=new Date(input.startAt),end=new Date(input.endAt);if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new Error("Event end must be after its start.");
 const brand:any[]=await sql`SELECT id FROM wgos.brands WHERE id=${input.brandId} LIMIT 1`;if(!brand[0])throw new Error("Brand not found.");
 if(input.projectId){const p:any[]=await sql`SELECT id FROM wgos.projects WHERE id=${input.projectId}::uuid AND brand_id=${input.brandId} LIMIT 1`;if(!p[0])throw new Error("Project is outside this brand.");}
 const rows:any[]=await sql`INSERT INTO wgos.calendar_events(brand_id,project_id,title,start_at,end_at,timezone,status,metadata) VALUES(${input.brandId},${input.projectId||null}::uuid,${title},${start.toISOString()},${end.toISOString()},${timezone},'SCHEDULED','{}'::jsonb) RETURNING *`;
 const e=rows[0];await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'CALENDAR_EVENT_CREATED','calendar_event',${String(e.id)},jsonb_build_object('brandId',${input.brandId},'title',${title}))`;return e;
}
export async function updateCalendarEventStatus(input:{id:string;status:string;actor:string}){
 const sql=db(),status=validStatus(input.status);
 const existing:any[]=await sql`SELECT * FROM wgos.calendar_events WHERE id=${input.id}::uuid LIMIT 1`;const current=existing[0];if(!current)throw new Error("Calendar event not found.");
 if(status==="CANCELLED"&&current.external_provider==="GOOGLE"&&current.external_event_ref)await cancelGoogleCalendarEvent(String(current.external_event_ref));
 const rows:any[]=await sql`UPDATE wgos.calendar_events SET status=${status} WHERE id=${input.id}::uuid RETURNING *`;
 const e=rows[0];if(!e)throw new Error("Calendar event not found.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'CALENDAR_EVENT_STATUS_UPDATED','calendar_event',${String(e.id)},jsonb_build_object('status',${status}))`;return e;
}
export async function syncCalendarEventToGoogle(input:{id:string;actor:string}){
 const sql=db();const rows:any[]=await sql`SELECT e.*,b.name brand_name,p.title project_title FROM wgos.calendar_events e JOIN wgos.brands b ON b.id=e.brand_id LEFT JOIN wgos.projects p ON p.id=e.project_id WHERE e.id=${input.id}::uuid LIMIT 1`;const e=rows[0];if(!e)throw new Error("Calendar event not found.");if(e.status==="CANCELLED")throw new Error("Cancelled events cannot be synchronized.");if(e.external_provider==="GOOGLE"&&e.external_event_ref)return e;
 const result=await createGoogleCalendarEvent({title:String(e.title),startAt:String(e.start_at),endAt:String(e.end_at),timezone:String(e.timezone||"UTC"),description:[e.brand_name,e.project_title].filter(Boolean).join(" · ")});
 const updated:any[]=await sql`UPDATE wgos.calendar_events SET external_provider='GOOGLE',external_event_ref=${result.externalId},metadata=COALESCE(metadata,'{}'::jsonb)||${JSON.stringify({googleHtmlLink:result.htmlLink})}::jsonb WHERE id=${input.id}::uuid RETURNING *`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'CALENDAR_EVENT_SYNCED_TO_GOOGLE','calendar_event',${input.id},jsonb_build_object('externalId',${result.externalId}))`;return updated[0];
}

import "server-only";
import {db} from "./db";

const channels=new Set(["EMAIL","SMS","PHONE","PORTAL","OTHER"]);
const directions=new Set(["INBOUND","OUTBOUND"]);

export async function listCommunicationThreads(brandId?:string){
 const sql=db();
 if(brandId)return sql`SELECT t.*,b.name brand_name,o.name organization_name,m.direction recent_direction,m.body_ref recent_body,m.occurred_at recent_at FROM wgos.communication_threads t JOIN wgos.brands b ON b.id=t.brand_id LEFT JOIN wgos.organizations o ON o.id=t.organization_id LEFT JOIN LATERAL(SELECT direction,body_ref,occurred_at FROM wgos.communication_messages x WHERE x.thread_id=t.id ORDER BY occurred_at DESC LIMIT 1)m ON true WHERE t.brand_id=${brandId} ORDER BY t.updated_at DESC`;
 return sql`SELECT t.*,b.name brand_name,o.name organization_name,m.direction recent_direction,m.body_ref recent_body,m.occurred_at recent_at FROM wgos.communication_threads t JOIN wgos.brands b ON b.id=t.brand_id LEFT JOIN wgos.organizations o ON o.id=t.organization_id LEFT JOIN LATERAL(SELECT direction,body_ref,occurred_at FROM wgos.communication_messages x WHERE x.thread_id=t.id ORDER BY occurred_at DESC LIMIT 1)m ON true ORDER BY t.updated_at DESC`;
}

export async function listThreadMessages(threadId:string){
 const sql=db();return sql`SELECT * FROM wgos.communication_messages WHERE thread_id=${threadId}::uuid ORDER BY occurred_at ASC`;
}

export async function createCommunicationThread(input:{brandId:string;channel:string;subject?:string;organizationId?:string|null;actor:string}){
 if(!channels.has(input.channel))throw new Error("Unsupported communication channel.");
 const sql=db();const rows=await sql`INSERT INTO wgos.communication_threads(brand_id,organization_id,channel,subject,status) VALUES(${input.brandId},${input.organizationId||null}::uuid,${input.channel},${input.subject?.trim()||null},'OPEN') RETURNING *`;
 const thread:any=rows[0];await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'COMMUNICATION_THREAD_CREATED','communication_thread',${String(thread.id)},jsonb_build_object('brandId',${input.brandId},'channel',${input.channel}))`;return thread;
}

export async function addCommunicationMessage(input:{threadId:string;direction:string;body:string;actor:string}){
 if(!directions.has(input.direction))throw new Error("Unsupported message direction.");
 const body=input.body.trim();if(!body)throw new Error("Message text is required.");
 const sql=db();const rows=await sql`INSERT INTO wgos.communication_messages(thread_id,direction,sender_ref,body_ref) VALUES(${input.threadId}::uuid,${input.direction},${input.actor},${body}) RETURNING *`;
 await sql`UPDATE wgos.communication_threads SET updated_at=now(),status='OPEN' WHERE id=${input.threadId}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'COMMUNICATION_MESSAGE_LOGGED','communication_thread',${input.threadId},jsonb_build_object('direction',${input.direction}))`;return rows[0];
}

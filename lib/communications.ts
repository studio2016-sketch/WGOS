import "server-only";
import {db} from "./db";
import {sendGoogleEmail,getGoogleGmailThread,googleManagementConfigured} from "./google-workspace";

const channels=new Set(["EMAIL","SMS","PHONE","PORTAL","OTHER"]);
const directions=new Set(["INBOUND","OUTBOUND"]);

export async function listCommunicationThreads(brandId?:string){
 const sql=db();
 if(brandId)return sql`SELECT t.*,b.name brand_name,o.name organization_name,c.email contact_email,trim(concat_ws(' ',c.first_name,c.last_name)) contact_name,x.sender_name,x.reply_to_email,m.direction recent_direction,m.body_ref recent_body,m.occurred_at recent_at FROM wgos.communication_threads t JOIN wgos.brands b ON b.id=t.brand_id LEFT JOIN wgos.organizations o ON o.id=t.organization_id LEFT JOIN wgos.contacts c ON c.id=t.contact_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=t.brand_id LEFT JOIN LATERAL(SELECT direction,body_ref,occurred_at FROM wgos.communication_messages x WHERE x.thread_id=t.id ORDER BY occurred_at DESC LIMIT 1)m ON true WHERE t.brand_id=${brandId} ORDER BY t.updated_at DESC`;
 return sql`SELECT t.*,b.name brand_name,o.name organization_name,c.email contact_email,trim(concat_ws(' ',c.first_name,c.last_name)) contact_name,x.sender_name,x.reply_to_email,m.direction recent_direction,m.body_ref recent_body,m.occurred_at recent_at FROM wgos.communication_threads t JOIN wgos.brands b ON b.id=t.brand_id LEFT JOIN wgos.organizations o ON o.id=t.organization_id LEFT JOIN wgos.contacts c ON c.id=t.contact_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=t.brand_id LEFT JOIN LATERAL(SELECT direction,body_ref,occurred_at FROM wgos.communication_messages cm WHERE cm.thread_id=t.id ORDER BY occurred_at DESC LIMIT 1)m ON true ORDER BY t.updated_at DESC`;
}

export async function listThreadMessages(threadId:string){
 const sql=db();return sql`SELECT * FROM wgos.communication_messages WHERE thread_id=${threadId}::uuid ORDER BY occurred_at ASC`;
}

export async function createCommunicationThread(input:{brandId:string;channel:string;subject?:string;organizationId?:string|null;contactId?:string|null;actor:string}){
 if(!channels.has(input.channel))throw new Error("Unsupported communication channel.");
 const sql=db();if(input.contactId){const contact:any[]=await sql`SELECT id,organization_id FROM wgos.contacts WHERE id=${input.contactId}::uuid LIMIT 1`;if(!contact[0])throw new Error("Contact not found.");if(input.organizationId&&String(contact[0].organization_id||"")!==String(input.organizationId))throw new Error("Contact is outside the selected organization.");}const rows=await sql`INSERT INTO wgos.communication_threads(brand_id,organization_id,contact_id,channel,subject,status) VALUES(${input.brandId},${input.organizationId||null}::uuid,${input.contactId||null}::uuid,${input.channel},${input.subject?.trim()||null},'OPEN') RETURNING *`;
 const thread:any=rows[0];await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'COMMUNICATION_THREAD_CREATED','communication_thread',${String(thread.id)},jsonb_build_object('brandId',${input.brandId},'channel',${input.channel}))`;return thread;
}

export async function addCommunicationMessage(input:{threadId:string;direction:string;body:string;actor:string}){
 if(!directions.has(input.direction))throw new Error("Unsupported message direction.");
 const body=input.body.trim();if(!body)throw new Error("Message text is required.");
 const sql=db();const rows=await sql`INSERT INTO wgos.communication_messages(thread_id,direction,sender_ref,body_ref) VALUES(${input.threadId}::uuid,${input.direction},${input.actor},${body}) RETURNING *`;
 await sql`UPDATE wgos.communication_threads SET updated_at=now(),status='OPEN' WHERE id=${input.threadId}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'COMMUNICATION_MESSAGE_LOGGED','communication_thread',${input.threadId},jsonb_build_object('direction',${input.direction}))`;return rows[0];
}

export async function sendCommunicationEmail(input:{threadId:string;body:string;actor:string}){
 const body=input.body.trim();if(!body)throw new Error("Message text is required.");const sql=db();
 const rows:any[]=await sql`SELECT t.*,c.email contact_email,trim(concat_ws(' ',c.first_name,c.last_name)) contact_name,b.name brand_name,x.sender_name,x.reply_to_email
  FROM wgos.communication_threads t JOIN wgos.brands b ON b.id=t.brand_id LEFT JOIN wgos.contacts c ON c.id=t.contact_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=t.brand_id
  WHERE t.id=${input.threadId}::uuid LIMIT 1`;const t=rows[0];if(!t)throw new Error("Communication thread not found.");if(String(t.channel)!=="EMAIL")throw new Error("Only email threads can be sent through Gmail.");if(!t.contact_email)throw new Error("A contact email is required before sending.");
 const result=await sendGoogleEmail({to:String(t.contact_email),subject:String(t.subject||"Message from "+t.brand_name),body,fromName:t.sender_name||t.brand_name,replyTo:t.reply_to_email||null});
 const inserted:any[]=await sql`INSERT INTO wgos.communication_messages(thread_id,direction,sender_ref,recipient_refs,body_ref,external_message_ref,metadata) VALUES(${input.threadId}::uuid,'OUTBOUND',${input.actor},${JSON.stringify([String(t.contact_email)])}::jsonb,${body},${result.messageId},${JSON.stringify({provider:"GOOGLE_GMAIL",gmailThreadId:result.threadId})}::jsonb) RETURNING *`;
 await sql`UPDATE wgos.communication_threads SET external_thread_ref=COALESCE(external_thread_ref,${result.threadId}),updated_at=now(),status='OPEN' WHERE id=${input.threadId}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'COMMUNICATION_EMAIL_SENT','communication_thread',${input.threadId},jsonb_build_object('messageId',${result.messageId},'recipient',${String(t.contact_email)}))`;return inserted[0];
}

function gmailHeader(message:any,name:string){const rows=message?.payload?.headers||[];const hit=rows.find((x:any)=>String(x?.name||"").toLowerCase()===name.toLowerCase());return String(hit?.value||"");}
function decodeGmailData(data:any){if(!data)return "";try{const normalized=String(data).replace(/-/g,"+").replace(/_/g,"/");return Buffer.from(normalized,"base64").toString("utf8");}catch{return ""}}
function gmailPlainBody(payload:any):string{if(!payload)return "";if(String(payload.mimeType||"").toLowerCase()==="text/plain"&&payload.body?.data)return decodeGmailData(payload.body.data);for(const p of payload.parts||[]){const found=gmailPlainBody(p);if(found)return found}return ""}
export async function syncGmailReplies(input:{limit?:number}={}){
 if(!googleManagementConfigured())return {configured:false,threads:0,ingested:0,errors:0};
 const sql=db(),limit=Math.max(1,Math.min(Number(input.limit||50),100));
 const threads:any[]=await sql`SELECT id,brand_id,external_thread_ref FROM wgos.communication_threads WHERE channel='EMAIL' AND status='OPEN' AND external_thread_ref IS NOT NULL ORDER BY updated_at DESC LIMIT ${limit}`;
 let ingested=0,errors=0;const account=String(process.env.GOOGLE_GMAIL_ACCOUNT||"").toLowerCase();
 for(const t of threads){try{
  const remote:any=await getGoogleGmailThread(String(t.external_thread_ref));
  const known:any[]=await sql`SELECT external_message_ref FROM wgos.communication_messages WHERE thread_id=${t.id}::uuid AND external_message_ref IS NOT NULL`;const seen=new Set(known.map((x:any)=>String(x.external_message_ref)));
  for(const m of remote?.messages||[]){const id=String(m?.id||"");if(!id||seen.has(id))continue;const labels=new Set((m?.labelIds||[]).map((x:any)=>String(x)));const from=gmailHeader(m,"From"),to=gmailHeader(m,"To");if(labels.has("SENT")||from.toLowerCase().includes(account))continue;const body=(gmailPlainBody(m?.payload)||String(m?.snippet||"")).trim();if(!body)continue;const occurredAt=m?.internalDate?new Date(Number(m.internalDate)).toISOString():new Date().toISOString();
   const inserted:any[]=await sql`INSERT INTO wgos.communication_messages(thread_id,direction,sender_ref,recipient_refs,body_ref,external_message_ref,occurred_at,metadata) VALUES(${t.id}::uuid,'INBOUND',${from||"client:email"},${JSON.stringify(to?[to]:[])}::jsonb,${body},${id},${occurredAt},jsonb_build_object('provider','GOOGLE_GMAIL','gmailThreadId',${String(t.external_thread_ref)})) RETURNING id`;
   await sql`UPDATE wgos.communication_threads SET updated_at=now(),status='OPEN' WHERE id=${t.id}::uuid`;
   await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('service:gmail','COMMUNICATION_EMAIL_RECEIVED','communication_thread',${String(t.id)},jsonb_build_object('messageId',${id},'from',${from}))`;
   await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload) VALUES(${t.brand_id},'OWNER','IN_APP','CLIENT_EMAIL_RECEIVED','PENDING',jsonb_build_object('thread_id',${String(t.id)},'message_id',${String(inserted[0]?.id||"")}))`;seen.add(id);ingested++;
  }
 }catch{errors++;}}
 return {configured:true,threads:threads.length,ingested,errors};
}

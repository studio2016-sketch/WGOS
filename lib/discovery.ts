import "server-only";
import {createHmac,timingSafeEqual} from "crypto";
import {db} from "./db";

type DiscoveryState={status:string;readiness:number;missing:string[];questions:Array<{key:string;label:string;prompt:string;type?:string;required?:boolean}>;email_sent_at?:string|null;followup_count?:number;last_response_at?:string|null};

const clean=(v:any)=>String(v??"").trim();
const has=(v:any)=>{const s=clean(v).toLowerCase();return Boolean(s)&&!["not provided","not specified","not sure yet","prefer to discuss privately"].includes(s)};
function businessWindowOpen(now=new Date()){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",weekday:"short",hour:"2-digit",hour12:false}).formatToParts(now);
 const day=parts.find(x=>x.type==="weekday")?.value||"";const hour=Number(parts.find(x=>x.type==="hour")?.value||0);
 return !["Sat","Sun"].includes(day)&&hour>=8&&hour<18;
}

function secret(){const v=process.env.DISCOVERY_TOKEN_SECRET;if(!v)throw new Error("DISCOVERY_TOKEN_SECRET is not configured");return v;}
function sign(payload:string){return createHmac("sha256",secret()).update(payload).digest("base64url");}
export function issueDiscoveryToken(opportunityId:string,days=14){const exp=Math.floor(Date.now()/1000)+days*86400;const payload=opportunityId+"."+exp;return payload+"."+sign(payload);}
export function verifyDiscoveryToken(opportunityId:string,token:string){
 const parts=String(token||"").split(".");if(parts.length!==3)return false;
 const [id,exp,sig]=parts;if(id!==opportunityId||Number(exp)<Math.floor(Date.now()/1000))return false;
 const expected=sign(id+"."+exp);try{return timingSafeEqual(Buffer.from(sig),Buffer.from(expected));}catch{return false;}
}

function intakeValue(d:any,key:string){return d?.[key]??d?.answers?.[key]??"";}
export function assessDiscovery(discovery:any={}):DiscoveryState{
 const d=discovery||{},answers=d.answers||{};
 const requirements=[
  ["successCriteria","Success criteria","What would make this project feel completely successful to you?","textarea",true],
  ["scopeDetails","Scope clarity","What specifically should Studio2016 be responsible for delivering?","textarea",true],
  ["decisionAuthority","Decision authority","Who approves the investment and final scope?","text",true],
  ["decisionProcess","Decision process","Who else is involved, and what must happen before a final decision is made?","textarea",true],
  ["budgetConversation","Budget context","What investment range should we design around, or how would you prefer to establish budget?","text",true],
  ["existingSystems","Existing environment","What equipment, systems, venue production, or house resources already exist?","textarea",false],
  ["venueConstraints","Venue constraints","Are there venue, rigging, power, access, labor, noise, or operating restrictions we should account for?","textarea",false],
  ["scheduleConstraints","Schedule","What are the critical load-in, rehearsal, doors, event, strike, or completion deadlines?","textarea",false],
  ["broadcastRecording","Media","Will you need livestream, IMAG, recording, playback, broadcast, or content-delivery support?","textarea",false],
  ["technicalDocs","Documents","Share links to any rider, stage plot, venue drawing, photos, inventory, schedule, or technical documents.","textarea",false]
 ] as const;
 const intakeChecks:{key:string;label:string;value:any;weight:number}[]=[
  {key:"timeline",label:"timeline",value:intakeValue(d,"timeline"),weight:9},
  {key:"venue",label:"venue",value:intakeValue(d,"venue"),weight:9},
  {key:"scale",label:"audience / room scale",value:intakeValue(d,"scale"),weight:7},
  {key:"disciplines",label:"production disciplines",value:intakeValue(d,"disciplines"),weight:8},
  {key:"budget",label:"budget",value:intakeValue(d,"budget"),weight:8}
 ];
 const answerWeights:any={successCriteria:14,scopeDetails:14,decisionAuthority:10,decisionProcess:10,budgetConversation:8,existingSystems:5,venueConstraints:5,scheduleConstraints:4,broadcastRecording:2,technicalDocs:2};
 let score=0;const missing:string[]=[];const questions:any[]=[];
 for(const x of intakeChecks){if(has(x.value))score+=x.weight;else missing.push(x.label);}
 for(const [key,label,prompt,type,required] of requirements){
  const already=has(answers[key])||(key==="budgetConversation"&&has(intakeValue(d,"budget")));
  if(already)score+=answerWeights[key]||0;
  else{if(required)missing.push(label);questions.push({key,label,prompt,type,required});}
 }
 score=Math.min(100,score);
 const status=score>=90?"READY_FOR_PROPOSAL":score>=70?"MINOR_GAPS":"DISCOVERY_REQUIRED";
 return {status,readiness:score,missing:[...new Set(missing)],questions:questions.slice(0,8),email_sent_at:d._discovery?.email_sent_at||null,followup_count:Number(d._discovery?.followup_count||0),last_response_at:d._discovery?.last_response_at||null};
}

export async function getPublicDiscovery(opportunityId:string,token:string){
 if(!verifyDiscoveryToken(opportunityId,token))return null;
 const sql=db();const rows:any[]=await sql`SELECT o.id,o.title,o.stage,o.discovery,o.contact_name,o.contact_email,b.name brand_name,x.public_domain
 FROM wgos.opportunities o JOIN wgos.brands b ON b.id=o.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=o.brand_id
 WHERE o.id=${opportunityId}::uuid LIMIT 1`;
 const o=rows[0];if(!o)return null;const assessment=assessDiscovery(o.discovery||{});
 return {id:String(o.id),title:o.title,brandName:o.brand_name,contactName:o.contact_name,stage:o.stage,discovery:o.discovery||{},assessment};
}

export async function savePublicDiscovery(input:{opportunityId:string;token:string;answers:Record<string,unknown>}){
 if(!verifyDiscoveryToken(input.opportunityId,input.token))throw new Error("INVALID_DISCOVERY_ACCESS");
 const sql=db();const rows:any[]=await sql`SELECT id,brand_id,discovery,stage FROM wgos.opportunities WHERE id=${input.opportunityId}::uuid LIMIT 1`;const o=rows[0];if(!o)throw new Error("Opportunity not found.");
 const safe:any={};for(const [k,v] of Object.entries(input.answers||{}).slice(0,30))safe[String(k).slice(0,80)]=String(v??"").trim().slice(0,5000);
 const merged={...(o.discovery||{}),answers:{...((o.discovery||{}).answers||{}),...safe}};
 const assessment=assessDiscovery(merged);const now=new Date().toISOString();
 merged._discovery={...((merged as any)._discovery||{}),...assessment,last_response_at:now};
 const nextStage=assessment.status==="READY_FOR_PROPOSAL"?"DISCOVERY":"DISCOVERY";
 await sql`UPDATE wgos.opportunities SET discovery=${JSON.stringify(merged)}::jsonb,stage=${nextStage},updated_at=now() WHERE id=${input.opportunityId}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('client:discovery','DISCOVERY_RESPONSE_RECEIVED','opportunity',${input.opportunityId},${JSON.stringify({readiness:assessment.readiness,status:assessment.status})}::jsonb)`;
 await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload) VALUES(${o.brand_id},'OWNER','IN_APP','DISCOVERY_RESPONSE_RECEIVED','PENDING',${JSON.stringify({opportunity_id:input.opportunityId,readiness:assessment.readiness,status:assessment.status})}::jsonb)`;
 const threads:any[]=await sql`SELECT t.id FROM wgos.communication_threads t JOIN wgos.communication_messages m ON m.thread_id=t.id WHERE m.metadata->>'opportunityId'=${input.opportunityId} ORDER BY t.created_at DESC LIMIT 1`;
 if(threads[0])await sql`INSERT INTO wgos.communication_messages(thread_id,direction,sender_ref,body_ref,metadata) VALUES(${String(threads[0].id)}::uuid,'INBOUND','client:discovery',${"Discovery workspace submitted · "+assessment.readiness+"% readiness"},${JSON.stringify({provider:"STUDIO2016_DISCOVERY",opportunityId:input.opportunityId,answers:safe,status:assessment.status})}::jsonb)`;
 return assessment;
}

export async function prepareDiscoveryEmail(opportunityId:string){
 const sql=db();const rows:any[]=await sql`SELECT o.id,o.brand_id,o.title,o.stage,o.discovery,o.contact_name,o.contact_email,o.created_at,b.name brand_name,x.public_domain,x.sender_name,x.reply_to_email
 FROM wgos.opportunities o JOIN wgos.brands b ON b.id=o.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=o.brand_id
 WHERE o.id=${opportunityId}::uuid LIMIT 1`;const o=rows[0];if(!o||!o.contact_email||!o.public_domain)return null;
 const assessment=assessDiscovery(o.discovery||{});const token=issueDiscoveryToken(String(o.id));const url="https://"+String(o.public_domain).replace(/^https?:\/\//,"").replace(/\/$/,"")+"/discovery/"+o.id+"?access="+encodeURIComponent(token);
 return {...o,assessment,url};
}

async function findThread(sql:any,opportunityId:string){
 const rows:any[]=await sql`SELECT t.id FROM wgos.communication_threads t JOIN wgos.communication_messages m ON m.thread_id=t.id
 WHERE m.metadata->>'opportunityId'=${opportunityId} ORDER BY t.created_at DESC LIMIT 1`;return rows[0]?String(rows[0].id):null;
}

async function deliverViaBrandSite(payload:any){
 const endpoint=String(process.env.STUDIO2016_DISCOVERY_ENDPOINT||"").trim();const shared=String(process.env.WGOS_DISCOVERY_SHARED_SECRET||"").trim();
 if(!endpoint||!shared)throw new Error("Studio2016 discovery email delivery is not configured.");
 const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-wgos-discovery-secret":shared},body:JSON.stringify(payload),cache:"no-store"});
 const text=await r.text();let data:any={};try{data=JSON.parse(text)}catch{}if(!r.ok)throw new Error(data.error||"Discovery email delivery failed.");return data;
}

export async function processDiscoveryAutomation(input:{limit?:number}={}){
 const sql=db();const limit=Math.max(1,Math.min(Number(input.limit||40),100));
 const rows:any[]=await sql`SELECT o.id,o.brand_id,o.organization_id,o.title,o.stage,o.discovery,o.contact_name,o.contact_email,o.created_at FROM wgos.opportunities o
 WHERE o.source='PUBLIC_WEB_INQUIRY' AND o.stage IN ('NEW','QUALIFYING','DISCOVERY') AND o.contact_email IS NOT NULL
 AND EXISTS(SELECT 1 FROM wgos.audit_events ae WHERE ae.entity_type='opportunity' AND ae.entity_id=o.id::text AND ae.action='PUBLIC_WEB_INQUIRY_RECEIVED')
 AND NOT EXISTS(
  SELECT 1 FROM wgos.opportunities newer
  WHERE newer.brand_id=o.brand_id
   AND newer.source='PUBLIC_WEB_INQUIRY'
   AND newer.created_at>o.created_at
   AND newer.created_at<=o.created_at+interval '24 hours'
   AND newer.title=o.title
   AND newer.organization_id IS NOT DISTINCT FROM o.organization_id
   AND EXISTS(SELECT 1 FROM wgos.audit_events ae2 WHERE ae2.entity_type='opportunity' AND ae2.entity_id=newer.id::text AND ae2.action='PUBLIC_WEB_INQUIRY_RECEIVED')
 )
 ORDER BY o.created_at ASC LIMIT ${limit}`;
 let sent=0,reminded=0,skipped=0,failed=0;const errors:string[]=[];
 for(const o of rows){try{
  const d=o.discovery||{},meta=d._discovery||{},assessment=assessDiscovery(d);const created=new Date(o.created_at).getTime(),now=Date.now();
  const sentAt=meta.email_sent_at?new Date(meta.email_sent_at).getTime():0;const followups=Number(meta.followup_count||0);
  let kind:"initial"|"reminder"|null=null;
  const urgent=/^immediate\b/i.test(clean(d.urgency));
  if(!businessWindowOpen(new Date(now))&&!urgent){console.log("DISCOVERY_SKIP",JSON.stringify({id:String(o.id),reason:"outside_business_window",ageMinutes:Math.round((now-created)/60000),sentAt:meta.email_sent_at||null}));skipped++;continue;}
  if(!sentAt&&now-created>=5*60*1000)kind="initial";
  else if(sentAt&&assessment.status!=="READY_FOR_PROPOSAL"&&followups<1&&now-sentAt>=24*60*60*1000)kind="reminder";
  else if(sentAt&&assessment.status!=="READY_FOR_PROPOSAL"&&followups<2&&now-sentAt>=72*60*60*1000)kind="reminder";
  if(!kind){console.log("DISCOVERY_SKIP",JSON.stringify({id:String(o.id),reason:"not_due",ageMinutes:Math.round((now-created)/60000),sentAt:meta.email_sent_at||null,followups,status:assessment.status,readiness:assessment.readiness}));skipped++;continue;}
  const prepared=await prepareDiscoveryEmail(String(o.id));if(!prepared){skipped++;continue;}
  const first=String(o.contact_name||"").trim().split(/\s+/)[0]||"there";
  const subject=kind==="initial"?"A few details will help us design the right Studio2016 approach":"A quick follow-up on your Studio2016 project";
  const intro=kind==="initial"
    ?`Thank you for reaching out to Studio2016. We have enough information to begin evaluating your project, and we want to avoid asking you for anything you've already shared.`
    :`We're following up on your Studio2016 project so we can keep the recommendation moving without making assumptions.`;
  const questionText=prepared.assessment.questions.slice(0,5).map((q:any,i:number)=>`${i+1}. ${q.prompt}`).join("\n");
  const body=`Hi ${first},\n\n${intro}\n\nThe next step is a short discovery pass. You can answer the remaining questions in your private Studio2016 workspace:\n\n${prepared.url}\n\nThe most important items still open are:\n${questionText||"We have the core information needed and will review the project next."}\n\nIf you already have a rider, stage plot, venue drawing, equipment list, schedule, photos, or other technical documents, you can paste share links in the discovery workspace.\n\nWe use this step to make the proposal more accurate, reduce change orders, and make sure our recommendation reflects the outcome you're actually trying to create.\n\nStudio2016\nThe System Behind the Experience.`;
  const delivery=await deliverViaBrandSite({to:o.contact_email,subject,body,replyTo:prepared.reply_to_email||undefined,kind,opportunityId:String(o.id)});
  const threadId=await findThread(sql,String(o.id));
  if(threadId){
   await sql`UPDATE wgos.communication_threads SET channel='EMAIL',updated_at=now() WHERE id=${threadId}::uuid`;
   await sql`INSERT INTO wgos.communication_messages(thread_id,direction,sender_ref,recipient_refs,body_ref,external_message_ref,metadata)
    VALUES(${threadId}::uuid,'OUTBOUND','system:discovery',${JSON.stringify([String(o.contact_email)])}::jsonb,${body},${delivery.id||null},${JSON.stringify({provider:"STUDIO2016_RESEND",kind,opportunityId:String(o.id)})}::jsonb)`;
  }
  const nextMeta={...meta,status:assessment.status,readiness:assessment.readiness,missing:assessment.missing,questions:assessment.questions,email_sent_at:kind==="initial"?new Date().toISOString():meta.email_sent_at,followup_count:kind==="reminder"?followups+1:followups,last_email_at:new Date().toISOString()};
  const nextDiscovery={...d,_discovery:nextMeta};
  await sql`UPDATE wgos.opportunities SET discovery=${JSON.stringify(nextDiscovery)}::jsonb,stage=CASE WHEN stage='NEW' THEN 'QUALIFYING' ELSE stage END,updated_at=now() WHERE id=${String(o.id)}::uuid`;
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('system:discovery',${kind==="initial"?"DISCOVERY_EMAIL_SENT":"DISCOVERY_REMINDER_SENT"},'opportunity',${String(o.id)},${JSON.stringify({deliveryId:delivery.id||null,readiness:assessment.readiness})}::jsonb)`;
  if(kind==="initial")sent++;else reminded++;
 }catch(e){failed++;const message=e instanceof Error?e.message:"Discovery automation failed";errors.push(message);try{
  const existing:any[]=await sql`SELECT id FROM wgos.notification_events WHERE brand_id=${o.brand_id} AND event_type='DISCOVERY_AUTOMATION_FAILED' AND payload->>'opportunity_id'=${String(o.id)} AND created_at>now()-interval '6 hours' LIMIT 1`;
  if(!existing[0])await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload) VALUES(${o.brand_id},'OWNER','IN_APP','DISCOVERY_AUTOMATION_FAILED','PENDING',${JSON.stringify({opportunity_id:String(o.id),error:message})}::jsonb)`;
 }catch{}}}
 return {seen:rows.length,sent,reminded,skipped,failed,errors};
}

import "server-only";
import {db} from "./db";
import {createHash} from "crypto";

const clean=(v:unknown,max=1000)=>String(v??"").trim().slice(0,max);
const emailOk=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const dateOk=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v);

export async function submitPublicInquiry(input:{
 brandId:string;name:string;email:string;phone?:string;organizationName?:string;
 title?:string;message?:string;details?:Record<string,unknown>;honeypot?:string;
}){
 const sql=db();
 const brandId=clean(input.brandId,80),name=clean(input.name,160),email=clean(input.email,240).toLowerCase();
 const phone=clean(input.phone,80),organizationName=clean(input.organizationName,180),message=clean(input.message,6000);
 if(clean(input.honeypot,200))return {received:true,discarded:true};
 if(!brandId||!name||!emailOk(email))throw new Error("Name and a valid email are required.");

 const detailsForHash=input.details&&typeof input.details==="object"?input.details:{};
 const fingerprint=createHash("sha256").update(JSON.stringify({brandId,name,email,phone,organizationName,title:clean(input.title,220),message,details:detailsForHash})).digest("hex");
 const prior:any[]=await sql`SELECT response_body FROM wgos.idempotency_keys WHERE scope=${"public-inquiry:"+brandId} AND key=${fingerprint} AND (expires_at IS NULL OR expires_at>now()) LIMIT 1`;
 if(prior[0])return {received:true,duplicate:true};

 const recentEmail:any[]=await sql`SELECT count(*)::int n FROM wgos.opportunities
  WHERE brand_id=${brandId} AND source='PUBLIC_WEB_INQUIRY'
    AND lower(contact_email)=lower(${email}) AND created_at>now()-interval '15 minutes'`;
 if(Number(recentEmail[0]?.n||0)>=5)throw new Error("Too many inquiries from this email. Please try again later.");

 const recentBrand:any[]=await sql`SELECT count(*)::int n FROM wgos.opportunities
  WHERE brand_id=${brandId} AND source='PUBLIC_WEB_INQUIRY'
    AND created_at>now()-interval '1 minute'`;
 if(Number(recentBrand[0]?.n||0)>=60)throw new Error("Inquiry service is temporarily busy. Please try again shortly.");

 const brandRows:any[]=await sql`SELECT b.id,b.name,x.public_domain FROM wgos.brands b
  JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id
  WHERE b.id=${brandId} AND x.public_domain IS NOT NULL LIMIT 1`;
 const brand=brandRows[0];if(!brand)throw new Error("This brand is not configured for public inquiries.");

 let organizationId:string|null=null;
 if(organizationName){
  const orgRows:any[]=await sql`SELECT o.id FROM wgos.organizations o
   JOIN wgos.organization_brands ob ON ob.organization_id=o.id
   WHERE ob.brand_id=${brandId} AND lower(o.name)=lower(${organizationName}) LIMIT 1`;
  if(orgRows[0])organizationId=String(orgRows[0].id);
  else{
   const created:any[]=await sql`INSERT INTO wgos.organizations(name,type) VALUES(${organizationName},'PROSPECT') RETURNING id`;
   organizationId=String(created[0].id);
   await sql`INSERT INTO wgos.organization_brands(organization_id,brand_id) VALUES(${organizationId}::uuid,${brandId}) ON CONFLICT DO NOTHING`;
  }
 }

 let contactId:string;
 const contacts:any[]=await sql`SELECT id,organization_id,phone FROM wgos.contacts WHERE lower(email)=lower(${email}) ORDER BY updated_at DESC LIMIT 1`;
 if(contacts[0]){
  contactId=String(contacts[0].id);
  await sql`INSERT INTO wgos.contact_brands(contact_id,brand_id) VALUES(${contactId}::uuid,${brandId}) ON CONFLICT DO NOTHING`;
  await sql`UPDATE wgos.contacts SET
   organization_id=COALESCE(organization_id,${organizationId}::uuid),
   phone=CASE WHEN COALESCE(phone,'')='' AND ${phone}<>'' THEN ${phone} ELSE phone END,
   updated_at=now() WHERE id=${contactId}::uuid`;
 }else{
  const parts=name.split(/\s+/).filter(Boolean),first=parts.shift()||name,last=parts.join(" ")||"";
  const created:any[]=await sql`INSERT INTO wgos.contacts(organization_id,first_name,last_name,email,phone,role)
   VALUES(${organizationId}::uuid,${first},${last},${email},${phone||null},'PROSPECT') RETURNING id`;
  contactId=String(created[0].id);
  await sql`INSERT INTO wgos.contact_brands(contact_id,brand_id) VALUES(${contactId}::uuid,${brandId}) ON CONFLICT DO NOTHING`;
 }

 const title=clean(input.title,220)||`Website inquiry — ${name}`;
 const rawDetails=input.details&&typeof input.details==="object"?input.details:{};
 const details:any={};
 for(const [k,v] of Object.entries(rawDetails).slice(0,40)){
  const key=clean(k,80);if(!key)continue;
  details[key]=typeof v==="string"?clean(v,1200):v;
 }
 if(message)details.message=message;
 details.source="PUBLIC_WEB_INQUIRY";
 const eventDate=clean(details.eventDate||details.date,20);
 const opportunities:any[]=await sql`INSERT INTO wgos.opportunities(
  brand_id,organization_id,primary_contact_id,title,stage,estimated_value,target_date,owner_subject,
  discovery,recommendation,source,contact_name,contact_email)
 VALUES(${brandId},${organizationId}::uuid,${contactId}::uuid,${title},'NEW',0,
  ${dateOk(eventDate)?eventDate:null}::date,NULL,${JSON.stringify(details)}::jsonb,'{}'::jsonb,
  'PUBLIC_WEB_INQUIRY',${name},${email}) RETURNING id`;
 const opportunityId=String(opportunities[0].id);

 const threads:any[]=await sql`INSERT INTO wgos.communication_threads(
  brand_id,organization_id,contact_id,channel,subject,status)
 VALUES(${brandId},${organizationId}::uuid,${contactId}::uuid,'OTHER',${title},'OPEN') RETURNING id`;
 const threadId=String(threads[0].id);
 await sql`INSERT INTO wgos.communication_messages(
  thread_id,direction,sender_ref,recipient_refs,body_ref,occurred_at,metadata)
 VALUES(${threadId}::uuid,'INBOUND',${email},${JSON.stringify([brand.public_domain])}::jsonb,
  ${message||title},now(),jsonb_build_object('source','PUBLIC_WEB_INQUIRY','opportunityId',${opportunityId}::text))`;

 await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload)
 VALUES(${brandId},'OWNER','IN_APP','NEW_WEB_INQUIRY','PENDING',
  jsonb_build_object('opportunity_id',${opportunityId}::text,'contact_id',${contactId}::text,'thread_id',${threadId}::text,'name',${name}::text,'email',${email}::text))`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES('public:brand-site','PUBLIC_WEB_INQUIRY_RECEIVED','opportunity',${opportunityId},
  jsonb_build_object('brandId',${brandId}::text,'contactId',${contactId}::text,'threadId',${threadId}::text,'domain',${String(brand.public_domain)}::text))`;
 await sql`INSERT INTO wgos.idempotency_keys(scope,key,request_hash,response_code,response_body,expires_at)
 VALUES(${"public-inquiry:"+brandId},${fingerprint},${fingerprint},202,'{"received":true}'::jsonb,now()+interval '15 minutes')
 ON CONFLICT (scope,key) DO NOTHING`;
 return {received:true};
}
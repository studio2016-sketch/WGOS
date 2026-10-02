import "server-only";
import {createHash} from "crypto";
import {db} from "./db";
import {getSignWellDocument} from "./signwell";

const same=(a:unknown,b:unknown)=>String(a??"")===String(b??"");

export async function completeSignWellFromWebhook(input:{rawBody:string;eventId:string;documentId:string}){
 const sql=db();
 const existing:any[]=await sql`SELECT id FROM wgos.audit_events
  WHERE action='SIGNWELL_DOCUMENT_COMPLETED' AND metadata->>'eventId'=${input.eventId} LIMIT 1`;
 if(existing[0])return {processed:false,duplicate:true};

 const rows:any[]=await sql`SELECT e.id envelope_id,e.agreement_id,e.status envelope_status,
  a.content_hash agreement_hash,a.snapshot_hash,a.proposal_id,a.status agreement_status,
  p.brand_id
 FROM wgos.signature_envelopes e
 JOIN wgos.agreements a ON a.id=e.agreement_id
 JOIN wgos.proposals p ON p.id=a.proposal_id
 WHERE e.provider='SIGNWELL' AND e.external_envelope_id=${input.documentId}
 ORDER BY e.created_at DESC LIMIT 1`;
 const ctx=rows[0];
 if(!ctx)return {processed:false,reason:"NO_PENDING_AGREEMENT"};

 const live:any=await getSignWellDocument(input.documentId);
 const metadata=live?.metadata||{};
 if(!same(live?.id,input.documentId)||String(live?.status||"").toLowerCase()!=="completed")
  return {processed:false,reason:"PROVIDER_NOT_COMPLETED"};
 if(!same(metadata.agreement_id,ctx.agreement_id)||!same(metadata.agreement_hash,ctx.agreement_hash)||
    !same(metadata.proposal_id,ctx.proposal_id)||!same(metadata.snapshot_hash,ctx.snapshot_hash))
  throw new Error("SignWell document metadata does not match the WGOS agreement.");

 const payloadHash=createHash("sha256").update(input.rawBody).digest("hex");
 await sql`UPDATE wgos.signature_envelopes SET status='COMPLETED',
  metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('completed_at',now(),'provider_status',${String(live.status||"completed")}),
  updated_at=now() WHERE id=${ctx.envelope_id}::uuid`;
 await sql`UPDATE wgos.agreements SET status='SIGNED',signed_at=COALESCE(signed_at,now()),updated_at=now()
  WHERE id=${ctx.agreement_id}::uuid AND status<>'SIGNED'`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES('service:signwell','SIGNWELL_DOCUMENT_COMPLETED','agreement',${String(ctx.agreement_id)},
  jsonb_build_object('eventId',${input.eventId},'documentId',${input.documentId},'payloadHash',${payloadHash}))`;

 const dedupe='agreement-signed:'+String(ctx.agreement_id);
 const queued:any[]=await sql`SELECT id FROM wgos.outbox_events WHERE topic='AGREEMENT_SIGNED' AND dedupe_key=${dedupe} LIMIT 1`;
 if(!queued[0])await sql`INSERT INTO wgos.outbox_events(brand_id,topic,dedupe_key,payload,status)
  VALUES(${ctx.brand_id},'AGREEMENT_SIGNED',${dedupe},jsonb_build_object('agreement_id',${String(ctx.agreement_id)},'proposal_id',${String(ctx.proposal_id)}),'PENDING')`;
 await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload)
 VALUES(${ctx.brand_id},'OWNER','IN_APP','AGREEMENT_SIGNED','PENDING',
  jsonb_build_object('agreement_id',${String(ctx.agreement_id)},'proposal_id',${String(ctx.proposal_id)}))`;
 return {processed:true,agreementId:String(ctx.agreement_id)};
}
import "server-only";
import {db} from "./db";
import {createSignWellAgreementDocument,getSignWellDocument} from "./signwell";

export async function startAgreementSignature(input:{agreementId:string;actor:string}){
 const sql=db();
 const rows:any[]=await sql`SELECT a.id,a.status,a.title,a.content_hash,a.snapshot_hash,a.proposal_id,a.provider_external_id,
  p.brand_id,p.organization_id,b.name brand_name,org.name organization_name,
  t.title terms_title,t.terms_version,t.body terms_body,
  s.client_email,o.contact_name,o.contact_email,
  c.first_name,c.last_name,c.email contact_record_email,
  e.id envelope_id,e.external_envelope_id,e.status envelope_status,e.metadata envelope_metadata
 FROM wgos.agreements a
 JOIN wgos.proposals p ON p.id=a.proposal_id
 JOIN wgos.brands b ON b.id=p.brand_id
 LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 JOIN wgos.agreement_terms t ON t.id=a.terms_id
 JOIN wgos.accepted_snapshots s ON s.id=a.snapshot_id
 LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id
 LEFT JOIN wgos.contacts c ON c.id=o.primary_contact_id
 LEFT JOIN LATERAL (
  SELECT id,external_envelope_id,status,metadata FROM wgos.signature_envelopes
  WHERE agreement_id=a.id ORDER BY created_at DESC LIMIT 1
 ) e ON true
 WHERE a.id=${input.agreementId}::uuid LIMIT 1`;
 const a=rows[0];
 if(!a)throw new Error("Agreement not found.");
 if(a.status==="SIGNED")return {alreadySigned:true,status:"SIGNED",url:null,testMode:false};
 if(a.status!=="READY_FOR_SIGNATURE")throw new Error("Agreement is not ready for signature.");

 const existingUrl=a.envelope_metadata?.signing_url||a.envelope_metadata?.embedded_signing_url||null;
 if(a.external_envelope_id&&existingUrl){
  return {alreadySent:true,status:a.envelope_status||"SENT",url:String(existingUrl),testMode:Boolean(a.envelope_metadata?.test_mode)};
 }
 if(a.external_envelope_id&&!existingUrl){
  const live:any=await getSignWellDocument(String(a.external_envelope_id));
  const recipient=Array.isArray(live?.recipients)?live.recipients[0]:null;
  const url=recipient?.embedded_signing_url||null;
  if(url)return {alreadySent:true,status:String(live?.status||a.envelope_status||"SENT"),url:String(url),testMode:Boolean(a.envelope_metadata?.test_mode)};
 }

 const email=String(a.client_email||a.contact_email||a.contact_record_email||"").trim();
 if(!email)throw new Error("A client email is required before the agreement can be sent for signature.");
 const contactName=[a.first_name,a.last_name].filter(Boolean).join(" ").trim();
 const clientName=String(a.contact_name||contactName||a.organization_name||email).trim();
 const result=await createSignWellAgreementDocument({
  agreementId:String(a.id),agreementHash:String(a.content_hash),proposalId:String(a.proposal_id),snapshotHash:String(a.snapshot_hash),
  title:String(a.title||"Service Agreement"),brandName:String(a.brand_name),organizationName:a.organization_name||null,
  clientName,clientEmail:email,termsTitle:String(a.terms_title||"Agreement Terms"),termsVersion:String(a.terms_version),termsBody:String(a.terms_body)
 });
 const metadata={signing_url:result.url,test_mode:result.testMode,recipient_email:email};
 if(a.envelope_id){
  await sql`UPDATE wgos.signature_envelopes SET external_envelope_id=${result.externalId},status=${String(result.status||"SENT").toUpperCase()},metadata=COALESCE(metadata,'{}'::jsonb)||${JSON.stringify(metadata)}::jsonb,updated_at=now() WHERE id=${a.envelope_id}::uuid`;
 }else{
  await sql`INSERT INTO wgos.signature_envelopes(agreement_id,provider,external_envelope_id,status,metadata) VALUES(${a.id}::uuid,'SIGNWELL',${result.externalId},${String(result.status||"SENT").toUpperCase()},${JSON.stringify(metadata)}::jsonb)`;
 }
 await sql`UPDATE wgos.agreements SET provider='SIGNWELL',provider_external_id=${result.externalId},updated_at=now() WHERE id=${a.id}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(${input.actor},'SIGNATURE_REQUEST_CREATED','agreement',${String(a.id)},jsonb_build_object('provider','SIGNWELL','externalId',${result.externalId},'testMode',${result.testMode}))`;
 return {status:String(result.status||"SENT").toUpperCase(),url:result.url,testMode:result.testMode};
}
import "server-only";
import {createHash,randomBytes} from "crypto";
import {db} from "./db";

const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");

export async function issueAgreementAccess(input:{agreementId:string;actor:string}){
 const sql=db();
 const rows:any[]=await sql`SELECT a.id,a.status,a.proposal_id,a.proposal_version,p.brand_id,
  x.public_domain,x.contract_path_prefix
 FROM wgos.agreements a
 JOIN wgos.proposals p ON p.id=a.proposal_id
 LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=p.brand_id
 WHERE a.id=${input.agreementId}::uuid LIMIT 1`;
 const a=rows[0];
 if(!a)throw new Error("Agreement not found.");
 if(!["READY_FOR_SIGNATURE","SIGNED"].includes(String(a.status)))throw new Error("Agreement is not ready for client access.");

 const token=randomBytes(32).toString("base64url"),hash=tokenHash(token);
 await sql`UPDATE wgos.proposal_access_tokens SET revoked_at=now()
  WHERE proposal_id=${a.proposal_id}::uuid AND purpose='CLIENT_AGREEMENT' AND revoked_at IS NULL`;
 await sql`INSERT INTO wgos.proposal_access_tokens(proposal_id,proposal_version,token_hash,purpose)
  VALUES(${a.proposal_id}::uuid,${Number(a.proposal_version)},${hash},'CLIENT_AGREEMENT')`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
  VALUES(${input.actor},'AGREEMENT_CLIENT_ACCESS_ISSUED','agreement',${String(a.id)},
   jsonb_build_object('proposalId',${String(a.proposal_id)},'proposalVersion',${Number(a.proposal_version)}))`;
 const prefix=String(a.contract_path_prefix||"/sign").replace(/\/$/,"");
 const path=`${prefix}/${a.id}?access=${encodeURIComponent(token)}`;
 return {path,url:a.public_domain?`https://${a.public_domain}${path}`:null,token};
}

export async function getPublicAgreement(agreementId:string,token:string){
 const sql=db(),hash=tokenHash(token);
 const rows:any[]=await sql`SELECT a.id,a.title,a.status,a.signed_at,a.content_hash,a.proposal_id,a.proposal_version,
  p.brand_id,p.currency,p.one_time_total,p.deposit_amount,
  b.name brand_name,org.name organization_name,t.title terms_title,t.body terms_body,t.terms_version,
  e.status envelope_status,e.external_envelope_id,e.metadata envelope_metadata
 FROM wgos.agreements a
 JOIN wgos.proposals p ON p.id=a.proposal_id
 JOIN wgos.proposal_access_tokens pat ON pat.proposal_id=p.id AND pat.proposal_version=a.proposal_version
 JOIN wgos.brands b ON b.id=p.brand_id
 LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 JOIN wgos.agreement_terms t ON t.id=a.terms_id
 LEFT JOIN LATERAL (
  SELECT status,external_envelope_id,metadata FROM wgos.signature_envelopes
  WHERE agreement_id=a.id ORDER BY created_at DESC LIMIT 1
 ) e ON true
 WHERE a.id=${agreementId}::uuid
   AND pat.token_hash=${hash}
   AND pat.purpose='CLIENT_AGREEMENT'
   AND pat.revoked_at IS NULL
   AND a.status IN ('READY_FOR_SIGNATURE','SIGNED')
 LIMIT 1`;
 const a=rows[0];if(!a)return null;
 return {
  agreement:{
   id:a.id,title:a.title,status:a.status,signed_at:a.signed_at,content_hash:a.content_hash,
   brand_name:a.brand_name,organization_name:a.organization_name,currency:a.currency,
   one_time_total:a.one_time_total,deposit_amount:a.deposit_amount,
   terms_title:a.terms_title,terms_body:a.terms_body,terms_version:a.terms_version,
   envelope_status:a.envelope_status||null,
   signing_url:a.envelope_metadata?.embedded_signing_url||a.envelope_metadata?.signing_url||null
  }
 };
}
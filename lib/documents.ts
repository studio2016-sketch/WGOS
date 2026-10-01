import "server-only";import {db} from "./db";
export async function getBrandExperience(brandId:string){const sql=db();const r=await sql`SELECT b.id,b.name,x.* FROM wgos.brands b LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id WHERE b.id=${brandId} LIMIT 1`;return r[0]??null}
export async function createProposalDraft(input:{opportunityId:string;actor:string;expiresAt?:string|null}){
 const sql=db();const os=await sql`SELECT * FROM wgos.opportunities WHERE id=${input.opportunityId}::uuid LIMIT 1`;const o:any=os[0];if(!o)throw new Error("Opportunity not found.");
 const versions=await sql`SELECT COALESCE(max(version),0)::int n FROM wgos.proposals WHERE opportunity_id=${o.id}::uuid`;const version=Number((versions[0] as any)?.n||0)+1;
 const content={publicPath:"/proposal/"+o.id+"/v/"+version,expiresAt:input.expiresAt||null};
 const rows=await sql`INSERT INTO wgos.proposals(opportunity_id,brand_id,organization_id,version,status,currency,one_time_total,content) VALUES(${o.id}::uuid,${o.brand_id},${o.organization_id||null}::uuid,${version},'DRAFT','USD',${Number(o.estimated_value||0)},${JSON.stringify(content)}::jsonb) RETURNING *`;
 const p:any=rows[0];await sql`UPDATE wgos.opportunities SET proposal_id=${p.id}::uuid,stage='PROPOSAL',updated_at=now() WHERE id=${o.id}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'PROPOSAL_DRAFT_CREATED','proposal',${String(p.id)},${JSON.stringify({opportunityId:o.id,version})}::jsonb)`;return p;
}
export async function proposalPublicUrl(proposalId:string){const sql=db();const rows=await sql`SELECT p.id,p.content,b.name,x.public_domain,x.proposal_path_prefix FROM wgos.proposals p JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id WHERE p.id=${proposalId}::uuid LIMIT 1`;const r:any=rows[0];if(!r)return null;const path=String(r.content?.publicPath||((r.proposal_path_prefix||"/proposal")+"/"+r.id));if(!r.public_domain)return {brand:r.name,path,url:null};return {brand:r.name,path,url:"https://"+r.public_domain+path};}
export async function listProposals(){const sql=db();return sql`SELECT p.*,o.title opportunity_title,b.name brand_name,org.name organization_name FROM wgos.proposals p LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id ORDER BY p.updated_at DESC`;}
export async function updateProposalFinancials(input:{proposalId:string;oneTimeTotal:number;depositAmount:number;actor:string}){const sql=db();const rows=await sql`UPDATE wgos.proposals SET one_time_total=${Math.max(0,input.oneTimeTotal)},deposit_amount=${Math.max(0,input.depositAmount)},updated_at=now() WHERE id=${input.proposalId}::uuid AND status='DRAFT' RETURNING *`;const p:any=rows[0];if(!p)throw new Error("Editable proposal not found.");await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'PROPOSAL_PRICING_UPDATED','proposal',${String(p.id)},${JSON.stringify({oneTimeTotal:input.oneTimeTotal,depositAmount:input.depositAmount})}::jsonb)`;return p;}
export async function approveProposal(input:{proposalId:string;actor:string}){const sql=db();const rows=await sql`UPDATE wgos.proposals SET status='APPROVED',approved_by_subject=${input.actor},approved_at=now(),updated_at=now() WHERE id=${input.proposalId}::uuid AND status='DRAFT' RETURNING *`;const p:any=rows[0];if(!p)throw new Error("Draft proposal not found.");await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'PROPOSAL_APPROVED','proposal',${String(p.id)},'{}'::jsonb)`;return p;}

export async function clientExperienceReadiness(){const sql=db();return sql`
 SELECT b.id,b.name,x.public_domain,x.sender_name,x.sender_email,x.reply_to_email,x.proposal_path_prefix,x.contract_path_prefix,x.portal_path_prefix,x.payment_path_prefix,
 (CASE WHEN NULLIF(trim(COALESCE(x.public_domain,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.sender_name,'')),'') IS NOT NULL AND NULLIF(trim(COALESCE(x.sender_email,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.proposal_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.contract_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.portal_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.payment_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END)::int readiness_points
 FROM wgos.brands b LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id ORDER BY b.name`;}

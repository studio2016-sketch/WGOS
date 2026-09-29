import "server-only";import {db} from "./db";
export async function getBrandExperience(brandId:string){const sql=db();const r=await sql`SELECT b.id,b.name,x.* FROM wgos.brands b LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id WHERE b.id=${brandId} LIMIT 1`;return r[0]??null}
export async function createProposalDraft(input:{opportunityId:string;actor:string;expiresAt?:string|null}){
 const sql=db();const os=await sql`SELECT * FROM wgos.opportunities WHERE id=${input.opportunityId}::uuid LIMIT 1`;const o:any=os[0];if(!o)throw new Error("Opportunity not found.");
 const versions=await sql`SELECT COALESCE(max(version),0)::int n FROM wgos.proposals WHERE opportunity_id=${o.id}::uuid`;const version=Number((versions[0] as any)?.n||0)+1;
 const path="/proposal/"+o.id+"/v/"+version;
 const rows=await sql`INSERT INTO wgos.proposals(opportunity_id,brand_id,version,status,public_path,total_cents,currency,expires_at,created_by) VALUES(${o.id}::uuid,${o.brand_id},${version},'DRAFT',${path},${o.value_cents},${o.currency},${input.expiresAt||null}::timestamptz,${input.actor}) RETURNING *`;
 const p:any=rows[0];await sql`INSERT INTO wgos.commercial_events(brand_id,opportunity_id,event_type,actor_subject,metadata) VALUES(${o.brand_id},${o.id}::uuid,'PROPOSAL_DRAFT_CREATED',${input.actor},${JSON.stringify({proposalId:p.id,version})}::jsonb)`;return p;
}
export async function proposalPublicUrl(proposalId:string){const sql=db();const rows=await sql`SELECT p.public_path,b.name,x.public_domain FROM wgos.proposals p JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id WHERE p.id=${proposalId}::uuid LIMIT 1`;const r:any=rows[0];if(!r)return null;if(!r.public_domain)return {brand:r.name,path:r.public_path,url:null};return {brand:r.name,path:r.public_path,url:"https://"+r.public_domain+r.public_path};}

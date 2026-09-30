import "server-only";
import {createHash,randomBytes} from "crypto";
import {db} from "./db";

function tokenHash(token:string){return createHash("sha256").update(token).digest("hex");}
function isExpired(content:any){const raw=content?.expiresAt;if(!raw)return false;const when=new Date(raw).getTime();return Number.isFinite(when)&&when<=Date.now();}

export async function issueProposalAccess(input:{proposalId:string;actor:string}){
 const sql=db();
 const rows=await sql`SELECT p.id,p.version,p.status,p.brand_id,p.content,x.public_domain,x.proposal_path_prefix
 FROM wgos.proposals p LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=p.brand_id
 WHERE p.id=${input.proposalId}::uuid LIMIT 1`;
 const p:any=rows[0];if(!p)throw new Error("Proposal not found.");
 if(!["APPROVED","SENT"].includes(String(p.status)))throw new Error("Proposal must be approved before client access is issued.");
 if(isExpired(p.content))throw new Error("Proposal has expired.");
 const token=randomBytes(32).toString("base64url");const hash=tokenHash(token);
 await sql`UPDATE wgos.proposal_access_tokens SET revoked_at=now() WHERE proposal_id=${p.id}::uuid AND purpose='CLIENT_PROPOSAL' AND revoked_at IS NULL`;
 await sql`INSERT INTO wgos.proposal_access_tokens(proposal_id,proposal_version,token_hash,purpose) VALUES(${p.id}::uuid,${Number(p.version)},${hash},'CLIENT_PROPOSAL')`;
 await sql`UPDATE wgos.proposals SET public_token_hash=${hash},status='SENT',sent_at=COALESCE(sent_at,now()),updated_at=now() WHERE id=${p.id}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'PROPOSAL_CLIENT_ACCESS_ISSUED','proposal',${String(p.id)},${JSON.stringify({version:Number(p.version)})}::jsonb)`;
 const prefix=String(p.proposal_path_prefix||"/proposal").replace(/\/$/,"");const path=`${prefix}/${p.id}?access=${encodeURIComponent(token)}`;
 return {path,url:p.public_domain?`https://${p.public_domain}${path}`:null,token};
}

export async function getPublicProposal(proposalId:string,token:string){
 const sql=db();const hash=tokenHash(token);
 const rows=await sql`SELECT p.*,b.name brand_name,x.logo_ref,x.primary_color,x.accent_color,o.title opportunity_title,org.name organization_name
 FROM wgos.proposals p JOIN wgos.proposal_access_tokens t ON t.proposal_id=p.id AND t.proposal_version=p.version
 JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=p.brand_id
 LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id
 WHERE p.id=${proposalId}::uuid AND t.token_hash=${hash} AND t.purpose='CLIENT_PROPOSAL' AND t.revoked_at IS NULL AND p.status IN ('SENT','APPROVED') LIMIT 1`;
 const p:any=rows[0];if(!p||isExpired(p.content))return null;
 const sections=await sql`SELECT position,section_type,title,content FROM wgos.proposal_sections WHERE proposal_id=${p.id}::uuid ORDER BY position,id`;
 const items=await sql`SELECT position,name,description,quantity,unit_amount_cents,tax_cents,optional,selected,metadata FROM wgos.proposal_line_items WHERE proposal_id=${p.id}::uuid ORDER BY position,id`;
 return {proposal:p,sections,items};
}

export async function validateProposalAccess(proposalId:string,token:string){
 const sql=db();const hash=tokenHash(token);
 const rows=await sql`SELECT p.id,p.version,p.status,p.content FROM wgos.proposals p JOIN wgos.proposal_access_tokens t ON t.proposal_id=p.id AND t.proposal_version=p.version WHERE p.id=${proposalId}::uuid AND t.token_hash=${hash} AND t.purpose='CLIENT_PROPOSAL' AND t.revoked_at IS NULL LIMIT 1`;
 const p:any=rows[0];if(!p||!["SENT","APPROVED"].includes(String(p.status))||isExpired(p.content))return null;
 return p;
}

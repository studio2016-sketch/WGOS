import "server-only";
import {createHash,randomBytes} from "crypto";
import {db} from "./db";
const hash=(v:string)=>createHash("sha256").update(v).digest("hex");
export async function issuePortalAccess(input:{projectId:string;actor:string}){
 const sql=db();const rows:any[]=await sql`SELECT p.id,p.brand_id,p.organization_id,x.public_domain,x.portal_path_prefix FROM wgos.projects p LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=p.brand_id WHERE p.id=${input.projectId}::uuid LIMIT 1`;const p=rows[0];if(!p)throw new Error("Project not found.");
 const token=randomBytes(32).toString("base64url"),tokenHash=hash(token);
 await sql`UPDATE wgos.client_portal_access SET status='REVOKED' WHERE brand_id=${p.brand_id} AND organization_id=${p.organization_id}::uuid AND status='ACTIVE'`;
 await sql`INSERT INTO wgos.client_portal_access(brand_id,organization_id,token_hash,status) VALUES(${p.brand_id},${p.organization_id}::uuid,${tokenHash},'ACTIVE')`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'CLIENT_PORTAL_ACCESS_ISSUED','project',${String(p.id)},'{}'::jsonb)`;
 const path=String(p.portal_path_prefix||"/client")+"?access="+encodeURIComponent(token);return {url:p.public_domain?"https://"+p.public_domain+path:null,path,token};
}
export async function getClientPortal(token:string){
 const sql=db(),h=hash(token);const access:any[] = await sql`SELECT * FROM wgos.client_portal_access WHERE token_hash=${h} AND status='ACTIVE' AND (expires_at IS NULL OR expires_at>now()) LIMIT 1`;const a=access[0];if(!a)return null;
 const projects:any[]=await sql`SELECT id,title,status,start_at,end_at,updated_at FROM wgos.projects WHERE brand_id=${a.brand_id} AND organization_id=${a.organization_id}::uuid ORDER BY updated_at DESC`;
 const ids=projects.map((p:any)=>p.id);const tasks=ids.length?await sql`SELECT id,project_id,title,status,due_at,priority FROM wgos.tasks WHERE project_id=ANY(${ids}::uuid[]) ORDER BY due_at NULLS LAST,position`:[];await sql`UPDATE wgos.client_portal_access SET last_accessed_at=now() WHERE id=${a.id}::uuid`;return {brandId:a.brand_id,projects,tasks};
}

import "server-only";
import {db} from "./db";

export async function clientDecisionSignals(){
 const sql=db();
 const rows:any[]=await sql`SELECT r.id,r.brand_id,b.name brand_name,r.entity_type,r.entity_id,r.action,
  COALESCE(r.metadata->>'clientDecision',r.status) status,
  r.reason,
  r.metadata->>'clientDecisionNote' client_note,
  r.requested_at,r.decided_at,
  COALESCE(p.id,tp.id) project_id,
  COALESCE(p.title,tp.title) project_title,
  o.name organization_name
 FROM wgos.approval_requests r
 JOIN wgos.brands b ON b.id=r.brand_id
 LEFT JOIN wgos.projects p ON r.entity_type='project' AND r.entity_id=p.id::text
 LEFT JOIN wgos.tasks t ON r.entity_type='task' AND r.entity_id=t.id::text
 LEFT JOIN wgos.projects tp ON tp.id=t.project_id
 LEFT JOIN wgos.organizations o ON o.id=COALESCE(p.organization_id,tp.organization_id)
 WHERE r.status IN ('REJECTED','APPROVED')
   AND r.metadata->>'clientDecisionSource'='CLIENT_PORTAL'
   AND r.decided_at>now()-interval '14 days'
 ORDER BY r.decided_at DESC LIMIT 50`;
 return rows.map((x:any)=>({...x,project_id:x.project_id||null,reason:x.client_note||x.reason}));
}
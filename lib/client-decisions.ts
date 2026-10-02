import "server-only";
import {createHash} from "crypto";
import {db} from "./db";

const hash=(v:string)=>createHash("sha256").update(v).digest("hex");

export async function decideClientApproval(input:{token:string;approvalId:string;decision:"APPROVED"|"REVISION_REQUESTED";note?:string}){
 const sql=db(),h=hash(input.token);
 const rows:any[]=await sql`SELECT a.id access_id,a.brand_id,a.organization_id,r.id,r.entity_type,r.entity_id,r.status
 FROM wgos.client_portal_access a
 JOIN wgos.approval_requests r ON r.brand_id=a.brand_id
 WHERE a.token_hash=${h} AND a.status='ACTIVE' AND (a.expires_at IS NULL OR a.expires_at>now())
   AND r.id=${input.approvalId}::uuid LIMIT 1`;
 const x=rows[0];
 if(!x)throw new Error("Approval unavailable.");
 if(x.status!=="PENDING")throw new Error("This decision is no longer pending.");

 let scoped=false;
 if(x.entity_type==="project"){
  const q:any[]=await sql`SELECT 1 FROM wgos.projects WHERE id=${x.entity_id}::uuid AND brand_id=${x.brand_id} AND organization_id=${x.organization_id}::uuid LIMIT 1`;
  scoped=Boolean(q[0]);
 }else if(x.entity_type==="task"){
  const q:any[]=await sql`SELECT 1 FROM wgos.tasks t JOIN wgos.projects p ON p.id=t.project_id
   WHERE t.id=${x.entity_id}::uuid AND p.brand_id=${x.brand_id} AND p.organization_id=${x.organization_id}::uuid LIMIT 1`;
  scoped=Boolean(q[0]);
 }
 if(!scoped)throw new Error("Approval is outside this client workspace.");

 const finalStatus=input.decision==="APPROVED"?"APPROVED":"REVISION_REQUESTED";
 const dbStatus=finalStatus==="APPROVED"?"APPROVED":"REJECTED";
 const note=String(input.note||"").trim();
 const updated:any[]=await sql`UPDATE wgos.approval_requests
 SET status=${dbStatus},
     decided_by=NULL,
     decided_at=now(),
     metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object(
       'clientDecisionNote',${note},
       'clientDecisionSource','CLIENT_PORTAL',
       'clientDecision',${finalStatus},
       'clientDecisionAt',now()
     )
 WHERE id=${input.approvalId}::uuid AND status='PENDING'
 RETURNING id`;
 if(!updated[0])throw new Error("This decision is no longer pending.");

 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES('client:portal',${input.decision},'approval_request',${input.approvalId},
   jsonb_build_object('source','CLIENT_PORTAL','note',${note}))`;

 const existingEvent:any[]=await sql`SELECT id FROM wgos.outbox_events
  WHERE topic='CLIENT_DECISION' AND dedupe_key=${'client-decision:'+input.approvalId+':'+finalStatus} LIMIT 1`;
 if(!existingEvent[0]){
  await sql`INSERT INTO wgos.outbox_events(brand_id,topic,dedupe_key,payload,status)
  VALUES(${x.brand_id},'CLIENT_DECISION',${'client-decision:'+input.approvalId+':'+finalStatus},
   jsonb_build_object('approval_id',${input.approvalId},'decision',${finalStatus},'entity_type',${x.entity_type},'entity_id',${x.entity_id}),'PENDING')`;
 }

 await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload)
 SELECT ${x.brand_id},COALESCE(p.owner_subject,'OWNER'),'IN_APP',
   ${finalStatus==='APPROVED'?'CLIENT_APPROVAL':'CLIENT_REVISION_REQUESTED'},'PENDING',
   jsonb_build_object('approval_id',${input.approvalId},'entity_type',${x.entity_type},'entity_id',${x.entity_id},'note',${note})
 FROM (SELECT CASE
   WHEN ${x.entity_type}='project' THEN (SELECT owner_subject FROM wgos.projects WHERE id=${x.entity_id}::uuid)
   WHEN ${x.entity_type}='task' THEN (SELECT p.owner_subject FROM wgos.tasks t JOIN wgos.projects p ON p.id=t.project_id WHERE t.id=${x.entity_id}::uuid)
 END owner_subject) p`;

 return {ok:true,status:finalStatus};
}
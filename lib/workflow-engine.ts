import "server-only";
import {db} from "./db";

export async function processClientDecisionEvents(input:{limit?:number}={}){
 const sql=db(),limit=Math.max(1,Math.min(Number(input.limit||100),250));
 const events:any[]=await sql`SELECT id,brand_id,payload FROM wgos.outbox_events WHERE topic='CLIENT_DECISION' AND status='PENDING' AND next_attempt_at<=now() ORDER BY created_at LIMIT ${limit}`;
 let processed=0,advanced=0,failed=0;
 for(const event of events){
  try{
   const payload=event.payload||{},decision=String(payload.decision||""),entityType=String(payload.entity_type||""),entityId=String(payload.entity_id||"");
   if(entityType==="task"&&decision==="APPROVED"){
    const rows:any[]=await sql`UPDATE wgos.tasks SET status='DONE',completed_at=COALESCE(completed_at,now()),updated_at=now() WHERE id=${entityId}::uuid AND requires_approval=true AND status NOT IN ('DONE','CANCELLED') RETURNING id,project_id,title`;
    if(rows[0]){
     advanced++;
     await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('system:workflow','TASK_COMPLETED_BY_CLIENT_APPROVAL','TASK',${entityId},jsonb_build_object('outbox_event_id',${String(event.id)}))`;
     const deps:any[]=await sql`SELECT d.task_id FROM wgos.task_dependencies d JOIN wgos.tasks t ON t.id=d.task_id WHERE d.depends_on_task_id=${entityId}::uuid AND t.status='WAITING'`;
     for(const d of deps){
      const blockers:any[]=await sql`SELECT count(*)::int AS n FROM wgos.task_dependencies x JOIN wgos.tasks upstream ON upstream.id=x.depends_on_task_id WHERE x.task_id=${d.task_id}::uuid AND upstream.status<>'DONE'`;
      if(Number(blockers[0]?.n||0)===0){await sql`UPDATE wgos.tasks SET status='READY',updated_at=now() WHERE id=${d.task_id}::uuid AND status='WAITING'`;await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('system:workflow','TASK_RELEASED_AFTER_DEPENDENCIES','TASK',${String(d.task_id)},jsonb_build_object('trigger_task_id',${entityId}))`;}
     }
    }
   }
   await sql`UPDATE wgos.outbox_events SET status='PROCESSED',processed_at=now(),attempt_count=attempt_count+1,last_error=NULL WHERE id=${event.id}::uuid AND status='PENDING'`;processed++;
  }catch(e){
   failed++;await sql`UPDATE wgos.outbox_events SET attempt_count=attempt_count+1,last_error=${e instanceof Error?e.message:"Workflow processing failed"},next_attempt_at=now()+interval '15 minutes',status=CASE WHEN attempt_count>=4 THEN 'FAILED' ELSE 'PENDING' END WHERE id=${event.id}::uuid`;
  }
 }
 return {seen:events.length,processed,advanced,failed};
}
import "server-only";
import {db} from "./db";

export async function workflowHealth(){
 const sql=db();
 const [summary,dead,health]=await Promise.all([
  sql`SELECT
   count(*) FILTER(WHERE status='PENDING')::int pending,
   count(*) FILTER(WHERE status='FAILED')::int failed,
   count(*) FILTER(WHERE status='PROCESSED')::int processed
   FROM wgos.outbox_events`,
  sql`SELECT d.id,d.outbox_event_id,d.topic,d.error,d.failed_at,d.resolved_at,d.resolution,
    o.brand_id,b.name brand_name,o.attempt_count,o.last_error
   FROM wgos.dead_letter_events d
   JOIN wgos.outbox_events o ON o.id=d.outbox_event_id
   JOIN wgos.brands b ON b.id=o.brand_id
   WHERE d.resolved_at IS NULL
   ORDER BY d.failed_at DESC LIMIT 25`,
  sql`SELECT component,status,correlation_id,details,occurred_at FROM wgos.system_health_events ORDER BY occurred_at DESC LIMIT 20`
 ]);
 return {summary:summary[0]||{pending:0,failed:0,processed:0},dead,health};
}

export async function retryDeadLetter(input:{id:string;actor:string}){
 const sql=db();
 const rows:any[]=await sql`SELECT d.id,d.outbox_event_id,o.status,o.brand_id
  FROM wgos.dead_letter_events d JOIN wgos.outbox_events o ON o.id=d.outbox_event_id
  WHERE d.id=${input.id}::uuid AND d.resolved_at IS NULL LIMIT 1`;
 const row=rows[0];if(!row)throw new Error("Open dead-letter event not found.");
 await sql`UPDATE wgos.outbox_events SET status='PENDING',attempt_count=0,next_attempt_at=now(),last_error=NULL,processed_at=NULL
  WHERE id=${row.outbox_event_id}::uuid`;
 await sql`UPDATE wgos.dead_letter_events SET resolved_at=now(),resolution='REQUEUED' WHERE id=${row.id}::uuid AND resolved_at IS NULL`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
  VALUES(${input.actor},'DEAD_LETTER_REQUEUED','outbox_event',${String(row.outbox_event_id)},jsonb_build_object('deadLetterId',${String(row.id)}))`;
 return {ok:true,outboxEventId:String(row.outbox_event_id)};
}
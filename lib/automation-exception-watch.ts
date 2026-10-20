import "server-only";
import {db} from "./db";

/**
 * WGOS Master Operating Directive: exception-based automation, brand isolation,
 * source-linked facts, and human authorization for consequential decisions.
 *
 * This observer NEVER sends messages, spends money, signs agreements, changes
 * compensation, reassigns personnel, or starts/settles financial transactions.
 * It only places deduplicated, brand-scoped in-app attention events.
 */
export async function observeOperationalExceptions(input:{limit?:number;dryRun?:boolean}={}){
 const sql=db(),limit=Math.max(1,Math.min(Number(input.limit||100),200));
 const rows:any[]=await sql`
 SELECT t.id task_id,t.title,t.due_at,t.status,t.priority,
        p.id project_id,p.title project_title,p.brand_id,
        CASE WHEN t.status='BLOCKED' THEN 'TASK_BLOCKED'
             ELSE 'TASK_OVERDUE' END exception_type
 FROM wgos.tasks t
 JOIN wgos.projects p ON p.id=t.project_id
 JOIN wgos.brands b ON b.id=p.brand_id
 WHERE p.status IN ('PLANNING','ACTIVE','BLOCKED')
   AND (t.status='BLOCKED'
     OR (t.due_at<now() AND t.status NOT IN ('DONE','CANCELLED')))
 ORDER BY t.due_at ASC NULLS LAST,t.created_at ASC
 LIMIT ${limit}`;
 let created=0,alreadyNotified=0;const candidates:any[]=[];
 for(const row of rows){
  const payload={
   task_id:String(row.task_id),project_id:String(row.project_id),
   task_title:String(row.title),project_title:String(row.project_title),
   status:String(row.status),priority:String(row.priority),
   due_at:row.due_at?new Date(row.due_at).toISOString():null,
   source:"WGOS_TASKS",rule:"WGOS_EXCEPTION_WATCH_V1"
  };
  const prior:any[]=await sql`
   SELECT id FROM wgos.notification_events
   WHERE brand_id=${row.brand_id}
     AND event_type=${row.exception_type}
     AND payload->>'task_id'=${String(row.task_id)}
     AND created_at>=now()-interval '24 hours'
   LIMIT 1`;
  if(prior[0]){alreadyNotified++;continue;}
  candidates.push({brand_id:String(row.brand_id),event_type:String(row.exception_type),...payload});
  if(input.dryRun)continue;
  await sql`
   INSERT INTO wgos.notification_events
      (brand_id,recipient_subject,channel,event_type,status,payload)
   SELECT ${row.brand_id},'OWNER','IN_APP',${String(row.exception_type)},'PENDING',
          ${JSON.stringify(payload)}::jsonb
   WHERE NOT EXISTS(
    SELECT 1 FROM wgos.notification_events
    WHERE brand_id=${row.brand_id}
      AND event_type=${String(row.exception_type)}
      AND payload->>'task_id'=${String(row.task_id)}
      AND created_at>=now()-interval '24 hours'
   )`;
  created++;
 }
 return {scanned:rows.length,created:input.dryRun?0:created,alreadyNotified,
  dryRun:Boolean(input.dryRun),candidates:input.dryRun?candidates:undefined};
}

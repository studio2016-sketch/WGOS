import "server-only";
import {db} from "./db";

export async function observeProjectDeadlines(input:{limit?:number;dryRun?:boolean}={}){
 const sql=db(),limit=Math.max(1,Math.min(Number(input.limit||50),150));
 const rows:any[]=await sql`
 SELECT id,brand_id,title,status,end_at FROM wgos.projects
 WHERE status IN ('PLANNING','ACTIVE','BLOCKED')
 AND end_at>now() AND end_at<=now()+interval '48 hours'
 ORDER BY end_at LIMIT ${limit}`;
 let created=0,suppressed=0;const candidates:any[]=[];
 for(const p of rows){
  const payload={project_id:String(p.id),project_title:String(p.title),
   deadline:new Date(p.end_at).toISOString(),project_status:String(p.status),
   source:"WGOS_PROJECTS",rule:"PROJECT_DEADLINE_V1"};
  if(input.dryRun){candidates.push({brand_id:String(p.brand_id),...payload});continue;}
  const added:any[]=await sql`
  INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload)
  SELECT ${String(p.brand_id)},'OWNER','IN_APP','PROJECT_DEADLINE_APPROACHING','PENDING',
   ${JSON.stringify(payload)}::jsonb
  WHERE NOT EXISTS(
    SELECT 1 FROM wgos.notification_events
    WHERE brand_id=${String(p.brand_id)}
     AND event_type='PROJECT_DEADLINE_APPROACHING'
     AND payload->>'project_id'=${String(p.id)}
     AND payload->>'deadline'=${payload.deadline}
  ) RETURNING id`;
  if(added.length)created++;else suppressed++;
 }
 return {scanned:rows.length,created,suppressed,dryRun:Boolean(input.dryRun),
 candidates:input.dryRun?candidates:undefined};
}

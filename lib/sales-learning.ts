import "server-only";
import {db} from "./db";
export async function listSalesLearning(){
 const sql=db();
 const [events,reviews,patterns]=await Promise.all([
  sql`SELECT e.*,o.title,b.name brand_name FROM wgos.sales_learning_events e JOIN wgos.opportunities o ON o.id=e.opportunity_id JOIN wgos.brands b ON b.id=e.brand_id ORDER BY e.created_at DESC LIMIT 100`,
  sql`SELECT r.*,o.title,o.estimated_value,b.name brand_name FROM wgos.sales_deal_reviews r JOIN wgos.opportunities o ON o.id=r.opportunity_id JOIN wgos.brands b ON b.id=r.brand_id ORDER BY r.updated_at DESC`,
  sql`SELECT event_type,methodology_area,COALESCE(NULLIF(trim(event_label),''),'Unlabeled') label,count(*)::int uses,
   count(*) filter(where lower(coalesce(outcome,'')) in('positive','advanced','won','yes','success'))::int positive
   FROM wgos.sales_learning_events GROUP BY 1,2,3 HAVING count(*)>=1 ORDER BY positive DESC,uses DESC LIMIT 25`
 ]);
 return {events,reviews,patterns};
}
export async function recordLearningEvent(input:any){
 const sql=db();const opp=await sql`SELECT id,brand_id,stage FROM wgos.opportunities WHERE id=${String(input.opportunityId)}::uuid LIMIT 1`;if(!opp[0])throw new Error("Opportunity not found.");
 const rows=await sql`INSERT INTO wgos.sales_learning_events(opportunity_id,brand_id,event_type,event_label,before_stage,after_stage,methodology_area,action_taken,outcome,lesson,confidence,metadata,created_by)
 VALUES(${String(input.opportunityId)}::uuid,${String((opp[0] as any).brand_id)},${String(input.eventType||"OTHER")},${input.eventLabel||null},${input.beforeStage||null},${input.afterStage||null},${input.methodologyArea||null},${input.actionTaken||null},${input.outcome||null},${input.lesson||null},${Math.max(0,Math.min(100,Math.round(Number(input.confidence)||50)))},${JSON.stringify(input.metadata||{})}::jsonb,${input.actor||null}) RETURNING *`;return rows[0];
}
export async function upsertDealReview(input:any){
 const sql=db();const opp=await sql`SELECT id,brand_id FROM wgos.opportunities WHERE id=${String(input.opportunityId)}::uuid LIMIT 1`;if(!opp[0])throw new Error("Opportunity not found.");
 const rows=await sql`INSERT INTO wgos.sales_deal_reviews(opportunity_id,brand_id,outcome,primary_reason,what_worked,what_failed,objections,decisive_moment,competitor_notes,pricing_notes,relationship_notes,reusable_lesson,would_pursue_again,created_by)
 VALUES(${String(input.opportunityId)}::uuid,${String((opp[0] as any).brand_id)},${String(input.outcome||"NO_DECISION")},${input.primaryReason||null},${input.whatWorked||null},${input.whatFailed||null},${input.objections||null},${input.decisiveMoment||null},${input.competitorNotes||null},${input.pricingNotes||null},${input.relationshipNotes||null},${input.reusableLesson||null},${typeof input.wouldPursueAgain==="boolean"?input.wouldPursueAgain:null},${input.actor||null})
 ON CONFLICT(opportunity_id) DO UPDATE SET outcome=excluded.outcome,primary_reason=excluded.primary_reason,what_worked=excluded.what_worked,what_failed=excluded.what_failed,objections=excluded.objections,decisive_moment=excluded.decisive_moment,competitor_notes=excluded.competitor_notes,pricing_notes=excluded.pricing_notes,relationship_notes=excluded.relationship_notes,reusable_lesson=excluded.reusable_lesson,would_pursue_again=excluded.would_pursue_again,updated_at=now() RETURNING *`;return rows[0];
}

import "server-only";
import {db} from "./db";

export async function listPurposeEngine(authUserId?:string|null,isGlobal=false){
 const sql=db();
 const brands=authUserId&&!isGlobal
  ?await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships bm ON bm.brand_id=b.id AND bm.auth_user_id=${authUserId} AND bm.active=true ORDER BY b.name`
  :await sql`SELECT id,name FROM wgos.brands ORDER BY name`;
 const ids=brands.map((b:any)=>b.id);
 if(!ids.length)return {brands,profiles:[],principles:[],priorities:[],criteria:[],evaluations:[],scores:[],outcomes:[],users:[]};
 const [profiles,principles,priorities,criteria,evaluations,scores,outcomes,users]=await Promise.all([
  sql`SELECT * FROM wgos.purpose_profiles WHERE brand_id=ANY(${ids}::text[]) ORDER BY brand_id`,
  sql`SELECT * FROM wgos.purpose_principles WHERE brand_id=ANY(${ids}::text[]) ORDER BY priority,title`,
  sql`SELECT sp.*,u.display_name owner_name FROM wgos.strategic_priorities sp LEFT JOIN wgos.app_users u ON u.auth_user_id=sp.owner_subject WHERE sp.brand_id=ANY(${ids}::text[]) ORDER BY priority,title`,
  sql`SELECT * FROM wgos.purpose_decision_criteria WHERE brand_id=ANY(${ids}::text[]) ORDER BY priority,title`,
  sql`SELECT pe.*,u.display_name evaluated_by_name,d.display_name decided_by_name FROM wgos.purpose_evaluations pe LEFT JOIN wgos.app_users u ON u.auth_user_id=pe.evaluated_by LEFT JOIN wgos.app_users d ON d.auth_user_id=pe.decided_by WHERE pe.brand_id=ANY(${ids}::text[]) ORDER BY pe.created_at DESC LIMIT 300`,
  sql`SELECT s.*,c.title criterion_title,c.weight,c.hard_gate,c.minimum_score FROM wgos.purpose_evaluation_scores s JOIN wgos.purpose_decision_criteria c ON c.id=s.criterion_id WHERE c.brand_id=ANY(${ids}::text[]) ORDER BY c.priority`,
  sql`SELECT * FROM wgos.purpose_outcomes WHERE brand_id=ANY(${ids}::text[]) ORDER BY updated_at DESC LIMIT 300`,
  sql`SELECT DISTINCT u.auth_user_id,u.display_name,u.email FROM wgos.app_users u JOIN wgos.brand_memberships bm ON bm.auth_user_id=u.auth_user_id WHERE bm.brand_id=ANY(${ids}::text[]) AND bm.active=true ORDER BY u.display_name NULLS LAST,u.email`
 ]);
 return {brands,profiles,principles,priorities,criteria,evaluations,scores,outcomes,users};
}

export async function savePurposeProfile(input:any){
 const sql=db(),brandId=String(input.brandId);
 const status=String(input.status||"DRAFT");
 const min=Math.max(0,Math.min(100,Number(input.minimumAlignmentScore)||65));
 const over=Math.max(0,Math.min(100,Number(input.overrideBelowScore)||45));
 if(over>min)throw new Error("Override threshold should not exceed the minimum alignment score.");
 const rows=await sql`INSERT INTO wgos.purpose_profiles(brand_id,purpose_statement,mission_statement,vision_statement,primary_beneficiary,core_promise,definition_of_excellence,north_star_metric,planning_horizon,status,minimum_alignment_score,override_below_score,require_override_reason,version,approved_by,approved_at)
 VALUES(${brandId},${input.purposeStatement||null},${input.missionStatement||null},${input.visionStatement||null},${input.primaryBeneficiary||null},${input.corePromise||null},${input.definitionOfExcellence||null},${input.northStarMetric||null},${input.planningHorizon||null},${status},${min},${over},${input.requireOverrideReason!==false},1,CASE WHEN ${status}='ACTIVE' THEN ${input.actor||null} ELSE NULL END,CASE WHEN ${status}='ACTIVE' THEN now() ELSE NULL END)
 ON CONFLICT(brand_id) DO UPDATE SET purpose_statement=excluded.purpose_statement,mission_statement=excluded.mission_statement,vision_statement=excluded.vision_statement,primary_beneficiary=excluded.primary_beneficiary,core_promise=excluded.core_promise,definition_of_excellence=excluded.definition_of_excellence,north_star_metric=excluded.north_star_metric,planning_horizon=excluded.planning_horizon,status=excluded.status,minimum_alignment_score=excluded.minimum_alignment_score,override_below_score=excluded.override_below_score,require_override_reason=excluded.require_override_reason,version=wgos.purpose_profiles.version+1,approved_by=CASE WHEN excluded.status='ACTIVE' THEN ${input.actor||null} ELSE wgos.purpose_profiles.approved_by END,approved_at=CASE WHEN excluded.status='ACTIVE' THEN now() ELSE wgos.purpose_profiles.approved_at END,updated_at=now() RETURNING *`;
 return rows[0];
}

export async function createPurposePrinciple(input:any){
 const sql=db(),title=String(input.title||"").trim();if(!title)throw new Error("Principle title required.");
 const rows=await sql`INSERT INTO wgos.purpose_principles(brand_id,principle_type,title,description,priority,active) VALUES(${String(input.brandId)},${String(input.principleType||"OPERATING_PRINCIPLE")},${title},${input.description||null},${Number(input.priority)||100},true) RETURNING *`;return rows[0];
}
export async function updatePurposePrinciple(input:any){
 const sql=db();const rows=await sql`UPDATE wgos.purpose_principles SET active=${Boolean(input.active)},title=COALESCE(${input.title||null},title),description=COALESCE(${input.description||null},description),updated_at=now() WHERE id=${String(input.id)}::uuid RETURNING *`;if(!rows[0])throw new Error("Principle not found.");return rows[0];
}

export async function createStrategicPriority(input:any){
 const sql=db(),title=String(input.title||"").trim();if(!title)throw new Error("Priority title required.");
 const rows=await sql`INSERT INTO wgos.strategic_priorities(brand_id,title,description,priority,weight,status,start_date,target_date,success_metric,target_value,current_value,owner_subject)
 VALUES(${String(input.brandId)},${title},${input.description||null},${Number(input.priority)||100},${Math.max(1,Math.min(100,Number(input.weight)||10))},${String(input.status||"ACTIVE")},${input.startDate||null}::date,${input.targetDate||null}::date,${input.successMetric||null},${input.targetValue?Number(input.targetValue):null},${input.currentValue?Number(input.currentValue):null},${input.ownerSubject||null}) RETURNING *`;return rows[0];
}
export async function updateStrategicPriority(input:any){
 const sql=db();const rows=await sql`UPDATE wgos.strategic_priorities SET status=COALESCE(${input.status||null},status),current_value=COALESCE(${input.currentValue?Number(input.currentValue):null},current_value),updated_at=now() WHERE id=${String(input.id)}::uuid RETURNING *`;if(!rows[0])throw new Error("Strategic priority not found.");return rows[0];
}

export async function saveDecisionCriterion(input:any){
 const sql=db(),brandId=String(input.brandId),key=String(input.criterionKey||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_"),title=String(input.title||"").trim();if(!key||!title)throw new Error("Criterion key and title required.");
 const rows=await sql`INSERT INTO wgos.purpose_decision_criteria(brand_id,criterion_key,title,description,weight,hard_gate,minimum_score,active,priority)
 VALUES(${brandId},${key},${title},${input.description||null},${Math.max(1,Math.min(100,Number(input.weight)||10))},${Boolean(input.hardGate)},${Math.max(0,Math.min(100,Number(input.minimumScore)||0))},true,${Number(input.priority)||100})
 ON CONFLICT(brand_id,criterion_key) DO UPDATE SET title=excluded.title,description=excluded.description,weight=excluded.weight,hard_gate=excluded.hard_gate,minimum_score=excluded.minimum_score,active=true,priority=excluded.priority,updated_at=now() RETURNING *`;return rows[0];
}

export async function createPurposeEvaluation(input:any){
 const sql=db(),title=String(input.subjectTitle||"").trim();if(!title)throw new Error("Decision/subject title required.");
 const rows=await sql`INSERT INTO wgos.purpose_evaluations(brand_id,subject_type,subject_id,subject_title,decision_question,status,expected_outcome,assumptions,tradeoffs,evaluated_by)
 VALUES(${String(input.brandId)},${String(input.subjectType||"OTHER")},${input.subjectId||null},${title},${input.decisionQuestion||null},'REVIEW',${input.expectedOutcome||null},${input.assumptions||null},${input.tradeoffs||null},${input.actor||null}) RETURNING *`;const evaluation:any=rows[0];
 const criteria:any[]=await sql`SELECT id FROM wgos.purpose_decision_criteria WHERE brand_id=${String(input.brandId)} AND active=true ORDER BY priority`;
 for(const c of criteria)await sql`INSERT INTO wgos.purpose_evaluation_scores(evaluation_id,criterion_id,score) VALUES(${evaluation.id}::uuid,${c.id}::uuid,50) ON CONFLICT DO NOTHING`;
 await recalculatePurposeEvaluation(String(evaluation.id));return evaluation;
}

export async function saveEvaluationScore(input:any){
 const sql=db(),score=Math.max(0,Math.min(100,Number(input.score)||0));
 const rows=await sql`INSERT INTO wgos.purpose_evaluation_scores(evaluation_id,criterion_id,score,evidence,risk,mitigation) VALUES(${String(input.evaluationId)}::uuid,${String(input.criterionId)}::uuid,${score},${input.evidence||null},${input.risk||null},${input.mitigation||null})
 ON CONFLICT(evaluation_id,criterion_id) DO UPDATE SET score=excluded.score,evidence=excluded.evidence,risk=excluded.risk,mitigation=excluded.mitigation,updated_at=now() RETURNING *`;await recalculatePurposeEvaluation(String(input.evaluationId));return rows[0];
}

export async function recalculatePurposeEvaluation(evaluationId:string){
 const sql=db();const ev:any=(await sql`SELECT pe.*,pp.minimum_alignment_score,pp.override_below_score FROM wgos.purpose_evaluations pe JOIN wgos.purpose_profiles pp ON pp.brand_id=pe.brand_id WHERE pe.id=${evaluationId}::uuid LIMIT 1`)[0];if(!ev)throw new Error("Evaluation not found.");
 const scores:any[]=await sql`SELECT s.score,c.weight,c.hard_gate,c.minimum_score FROM wgos.purpose_evaluation_scores s JOIN wgos.purpose_decision_criteria c ON c.id=s.criterion_id WHERE s.evaluation_id=${evaluationId}::uuid AND c.active=true`;
 const totalWeight=scores.reduce((n:number,x:any)=>n+Number(x.weight||0),0);const weighted=totalWeight?scores.reduce((n:number,x:any)=>n+Number(x.score||0)*Number(x.weight||0),0)/totalWeight:0;
 const hardFail=scores.some((x:any)=>x.hard_gate&&Number(x.score||0)<Number(x.minimum_score||0));
 const status=hardFail||weighted<Number(ev.override_below_score||45)?"MISALIGNED":weighted<Number(ev.minimum_alignment_score||65)?"CONDITIONAL":"ALIGNED";
 const recommendation=hardFail?"Do not proceed until the failed non-negotiable is resolved or explicitly overridden.":status==="ALIGNED"?"Purpose-aligned. Proceed subject to normal operating controls.":status==="CONDITIONAL"?"Potentially worthwhile, but alignment is weak enough to require mitigation or explicit leadership judgment.":"Does not currently justify proceeding under the entity's stated purpose and policy.";
 await sql`UPDATE wgos.purpose_evaluations SET weighted_score=${weighted},hard_gate_failed=${hardFail},status=${status},recommendation=${recommendation},evaluated_at=now(),updated_at=now() WHERE id=${evaluationId}::uuid`;return {weighted,hardFail,status,recommendation};
}

export async function decidePurposeEvaluation(input:any){
 const sql=db(),id=String(input.evaluationId);const ev:any=(await sql`SELECT pe.*,pp.override_below_score,pp.require_override_reason FROM wgos.purpose_evaluations pe JOIN wgos.purpose_profiles pp ON pp.brand_id=pe.brand_id WHERE pe.id=${id}::uuid LIMIT 1`)[0];if(!ev)throw new Error("Evaluation not found.");
 const desired=String(input.status||"ALIGNED"),reason=String(input.overrideReason||"").trim();
 const requires=desired==="OVERRIDDEN"&&(ev.require_override_reason||Number(ev.weighted_score||0)<Number(ev.override_below_score||45));
 if(requires&&reason.length<12)throw new Error("A meaningful override reason is required.");
 const rows=await sql`UPDATE wgos.purpose_evaluations SET status=${desired},override_reason=${reason||null},decided_by=${input.actor||null},decided_at=now(),updated_at=now() WHERE id=${id}::uuid RETURNING *`;return rows[0];
}

export async function savePurposeOutcome(input:any){
 const sql=db(),evaluationId=String(input.evaluationId);const ev:any=(await sql`SELECT brand_id,expected_outcome FROM wgos.purpose_evaluations WHERE id=${evaluationId}::uuid LIMIT 1`)[0];if(!ev)throw new Error("Evaluation not found.");
 const rows=await sql`INSERT INTO wgos.purpose_outcomes(evaluation_id,brand_id,expected_result,actual_result,outcome_status,financial_result_cents,strategic_result,beneficiary_result,lessons,policy_recommendation,reviewed_by,reviewed_at)
 VALUES(${evaluationId}::uuid,${ev.brand_id},COALESCE(${input.expectedResult||null},${ev.expected_outcome||null}),${input.actualResult||null},${String(input.outcomeStatus||"PENDING")},${input.financialResult?Math.round(Number(input.financialResult)*100):null},${input.strategicResult||null},${input.beneficiaryResult||null},${input.lessons||null},${input.policyRecommendation||null},${input.actor||null},now())
 ON CONFLICT(evaluation_id) DO UPDATE SET actual_result=excluded.actual_result,outcome_status=excluded.outcome_status,financial_result_cents=excluded.financial_result_cents,strategic_result=excluded.strategic_result,beneficiary_result=excluded.beneficiary_result,lessons=excluded.lessons,policy_recommendation=excluded.policy_recommendation,reviewed_by=excluded.reviewed_by,reviewed_at=now(),updated_at=now() RETURNING *`;return rows[0];
}

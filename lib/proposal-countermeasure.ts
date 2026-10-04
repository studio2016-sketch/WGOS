import "server-only";
import {db} from "./db";
const requiredFields=["buyer_case","finance_case","technical_case","procurement_case","competitive_case","implementation_case","inaction_case","scope_risks","pricing_risks","assumptions","mitigation_plan","recommendation"] as const;
export function countermeasureReadiness(r:any){
 const present=requiredFields.filter(k=>String(r?.[k]||"").trim().length>=8).length;
 return Math.round(present/requiredFields.length*100);
}
export async function listCountermeasureReviews(){
 const sql=db();return sql`SELECT r.*,p.version,p.status proposal_status,p.one_time_total,o.title opportunity_title,b.name brand_name
 FROM wgos.proposal_countermeasure_reviews r JOIN wgos.proposals p ON p.id=r.proposal_id JOIN wgos.opportunities o ON o.id=r.opportunity_id JOIN wgos.brands b ON b.id=r.brand_id ORDER BY r.updated_at DESC`;
}
export async function getProposalCountermeasure(proposalId:string){
 const sql=db();const rows=await sql`SELECT * FROM wgos.proposal_countermeasure_reviews WHERE proposal_id=${proposalId}::uuid LIMIT 1`;return rows[0]||null;
}
export async function saveProposalCountermeasure(input:any){
 const sql=db();const p=await sql`SELECT p.id,p.opportunity_id,p.brand_id FROM wgos.proposals p WHERE p.id=${String(input.proposalId)}::uuid LIMIT 1`;if(!p[0])throw new Error("Proposal not found.");
 const draft:any={buyer_case:input.buyerCase,finance_case:input.financeCase,technical_case:input.technicalCase,procurement_case:input.procurementCase,competitive_case:input.competitiveCase,implementation_case:input.implementationCase,inaction_case:input.inactionCase,scope_risks:input.scopeRisks,pricing_risks:input.pricingRisks,legal_risks:input.legalRisks,assumptions:input.assumptions,missing_information:input.missingInformation,mitigation_plan:input.mitigationPlan,recommendation:input.recommendation};
 const readiness=countermeasureReadiness(draft);const status=readiness===100?"READY":"INCOMPLETE";
 const rows=await sql`INSERT INTO wgos.proposal_countermeasure_reviews(
  proposal_id,opportunity_id,brand_id,buyer_case,finance_case,technical_case,procurement_case,competitive_case,implementation_case,inaction_case,scope_risks,pricing_risks,legal_risks,assumptions,missing_information,mitigation_plan,recommendation,readiness_score,status,reviewed_by,reviewed_at
 ) VALUES(
  ${String(input.proposalId)}::uuid,${String((p[0] as any).opportunity_id)}::uuid,${String((p[0] as any).brand_id)},${input.buyerCase||null},${input.financeCase||null},${input.technicalCase||null},${input.procurementCase||null},${input.competitiveCase||null},${input.implementationCase||null},${input.inactionCase||null},${input.scopeRisks||null},${input.pricingRisks||null},${input.legalRisks||null},${input.assumptions||null},${input.missingInformation||null},${input.mitigationPlan||null},${input.recommendation||null},${readiness},${status},${input.actor||null},${status==="READY"?new Date().toISOString():null}::timestamptz
 ) ON CONFLICT(proposal_id) DO UPDATE SET buyer_case=excluded.buyer_case,finance_case=excluded.finance_case,technical_case=excluded.technical_case,procurement_case=excluded.procurement_case,competitive_case=excluded.competitive_case,implementation_case=excluded.implementation_case,inaction_case=excluded.inaction_case,scope_risks=excluded.scope_risks,pricing_risks=excluded.pricing_risks,legal_risks=excluded.legal_risks,assumptions=excluded.assumptions,missing_information=excluded.missing_information,mitigation_plan=excluded.mitigation_plan,recommendation=excluded.recommendation,readiness_score=excluded.readiness_score,status=excluded.status,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at,override_reason=null,updated_at=now() RETURNING *`;return rows[0];
}
export async function overrideProposalCountermeasure(input:{proposalId:string;reason:string;actor:string}){
 if(String(input.reason||"").trim().length<12)throw new Error("A specific override reason is required.");
 const sql=db();const rows=await sql`UPDATE wgos.proposal_countermeasure_reviews SET status='OVERRIDDEN',override_reason=${input.reason.trim()},reviewed_by=${input.actor},reviewed_at=now(),updated_at=now() WHERE proposal_id=${input.proposalId}::uuid RETURNING *`;if(!rows[0])throw new Error("Complete the countermeasure review before overriding it.");return rows[0];
}
export async function assertProposalCountermeasureReady(proposalId:string){
 const r:any=await getProposalCountermeasure(proposalId);if(!r)throw new Error("Proposal Countermeasure review is required before approval.");
 if(!["READY","OVERRIDDEN"].includes(String(r.status)))throw new Error(`Proposal Countermeasure is only ${Number(r.readiness_score||0)}% complete. Review all angles before approval.`);
 return r;
}

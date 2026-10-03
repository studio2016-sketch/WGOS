import "server-only";
import {db} from "./db";

export function dealScore(p:any){return ["fit_score","intent_score","authority_score","urgency_score","value_score"].reduce((n,k)=>n+Number(p?.[k]||0),0);}
export function pursuitTier(score:number,value:number){
 if(score>=80||value>=50000)return "STRATEGIC PURSUIT";
 if(score>=65||value>=25000)return "PRIORITY OPPORTUNITY";
 if(score>=45)return "STANDARD OPPORTUNITY";
 return "NURTURE";
}
export function nextBestAction(o:any,p:any){
 const value=Number(o.estimated_value||0),stage=String(o.stage||"NEW"),today=new Date().toISOString().slice(0,10);
 if(!p)return value>=10000?"Build deal map and identify economic buyer":"Complete qualification";
 if(p.next_commitment_due&&String(p.next_commitment_due).slice(0,10)<today)return "Next commitment is overdue — contact the client today";
 if(value>=10000&&!p.economic_buyer)return "Identify and engage the economic buyer";
 if(value>=10000&&!p.champion)return "Secure an internal champion";
 if(["QUALIFYING","DISCOVERY"].includes(stage)&&!p.decision_criteria)return "Document the client's decision criteria";
 if(["DISCOVERY","PROPOSAL"].includes(stage)&&!p.decision_process)return "Map the approval and decision process";
 if(stage==="PROPOSAL"&&!p.next_commitment)return "Secure a dated next commitment before follow-up";
 if(stage==="NEGOTIATION")return "Resolve final terms and ask for agreement + deposit";
 if(p.next_commitment)return p.next_commitment;
 return stage==="NEW"?"Qualify fit, authority and urgency":stage==="QUALIFYING"?"Advance to discovery":stage==="DISCOVERY"?"Build the value case":stage==="PROPOSAL"?"Confirm stakeholder review":stage==="WON"?"Activate delivery":"Review opportunity";
}
export async function listDealCommandProfiles(){
 const sql=db();
 return sql`SELECT d.*,o.title,o.stage,o.estimated_value,o.organization_id,o.primary_contact_id,b.name brand_name,org.name organization_name
 FROM wgos.deal_command_profiles d JOIN wgos.opportunities o ON o.id=d.opportunity_id JOIN wgos.brands b ON b.id=d.brand_id
 LEFT JOIN wgos.organizations org ON org.id=o.organization_id ORDER BY d.updated_at DESC`;
}
export async function upsertDealCommand(input:any){
 const sql=db();const opportunityId=String(input.opportunityId||"");
 const opp=await sql`SELECT id,brand_id FROM wgos.opportunities WHERE id=${opportunityId}::uuid LIMIT 1`;if(!opp[0])throw new Error("Opportunity not found.");
 const clamp=(v:any)=>Math.max(0,Math.min(20,Math.round(Number(v)||0)));const prob=Math.max(0,Math.min(100,Math.round(Number(input.probability)||0)));
 const expansion=Math.max(0,Number(input.expansionValue)||0);
 const rows=await sql`INSERT INTO wgos.deal_command_profiles(
  opportunity_id,brand_id,economic_buyer,champion,influencers,decision_criteria,decision_process,budget_range,competitors,urgency_notes,
  next_commitment,next_commitment_due,expansion_value,probability,fit_score,intent_score,authority_score,urgency_score,value_score,notes,created_by
 ) VALUES(
  ${opportunityId}::uuid,${String((opp[0] as any).brand_id)},${input.economicBuyer||null},${input.champion||null},${input.influencers||null},${input.decisionCriteria||null},${input.decisionProcess||null},${input.budgetRange||null},${input.competitors||null},${input.urgencyNotes||null},
  ${input.nextCommitment||null},${input.nextCommitmentDue||null}::date,${expansion},${prob},${clamp(input.fitScore)},${clamp(input.intentScore)},${clamp(input.authorityScore)},${clamp(input.urgencyScore)},${clamp(input.valueScore)},${input.notes||null},${input.actor||null}
 ) ON CONFLICT(opportunity_id) DO UPDATE SET
  economic_buyer=excluded.economic_buyer,champion=excluded.champion,influencers=excluded.influencers,decision_criteria=excluded.decision_criteria,
  decision_process=excluded.decision_process,budget_range=excluded.budget_range,competitors=excluded.competitors,urgency_notes=excluded.urgency_notes,
  next_commitment=excluded.next_commitment,next_commitment_due=excluded.next_commitment_due,expansion_value=excluded.expansion_value,probability=excluded.probability,
  fit_score=excluded.fit_score,intent_score=excluded.intent_score,authority_score=excluded.authority_score,urgency_score=excluded.urgency_score,value_score=excluded.value_score,
  notes=excluded.notes,updated_at=now() RETURNING *`;return rows[0];
}

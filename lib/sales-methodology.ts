export type Gap={key:string;label:string;framework:string;action:string;weight:number};
export function methodologyGaps(o:any,p:any):Gap[]{
 const value=Number(o?.estimated_value||0);const gaps:Gap[]=[];
 const add=(cond:boolean,key:string,label:string,framework:string,action:string,weight:number)=>{if(cond)gaps.push({key,label,framework,action,weight})};
 add(!p?.economic_buyer,"economicBuyer","Economic buyer unknown","MEDDPICC","Identify who can approve the money and get them into the process.",20);
 add(!p?.champion,"champion","No internal champion","MEDDPICC","Find the person who benefits from us winning and can sell internally.",16);
 add(!p?.pain_identified,"pain","Pain not explicit","MEDDPICC / Sandler","Document the business, operational, emotional or reputational pain of doing nothing.",18);
 add(!p?.metrics_quantified,"metrics","Value not quantified","MEDDPICC","Quantify cost, risk, revenue, efficiency, guest impact or operational improvement.",14);
 add(!p?.decision_criteria,"decisionCriteria","Decision criteria unknown","MEDDPICC","Ask what must be true for the client to select a partner.",12);
 add(!p?.decision_process,"decisionProcess","Decision path unknown","MEDDPICC","Map who decides, sequence, timing and veto points.",12);
 add(!p?.paper_process,"paperProcess","Procurement/paper process unknown","MEDDPICC","Map contract, vendor, insurance, legal, PO and payment requirements.",10);
 add(value>=10000&&!p?.challenger_insight,"challengerInsight","No commercial insight","Challenger","Teach the buyer something material they may be underestimating.",12);
 add(value>=10000&&!p?.reframe_message,"reframe","No reframe","Challenger","Reframe the problem around outcomes, risk and total value—not price alone.",10);
 add(!p?.discovery_questions,"discovery","Discovery plan missing","Sandler","Prepare questions for pain, impact, budget, decision and consequence.",10);
 add(!p?.budget_conversation,"budget","Budget conversation incomplete","Sandler","Clarify investment comfort, funding source and what happens if scope exceeds budget.",10);
 add(!p?.decision_tension,"decisionTension","No consequence of inaction","Sandler","Define the cost or consequence of delaying or doing nothing.",8);
 add(!p?.relationship_plan,"relationship","Relationship plan missing","Girard","Plan useful, personal follow-up that keeps us memorable without pestering.",6);
 add(o?.stage==="WON"&&!p?.referral_path,"referrals","Referral path missing","Girard","Ask who else could benefit and capture a warm introduction.",5);
 return gaps.sort((a,b)=>b.weight-a.weight);
}
export function methodologyReadiness(o:any,p:any){
 const gaps=methodologyGaps(o,p);const total=163;const lost=gaps.reduce((n,g)=>n+g.weight,0);return Math.max(0,Math.min(100,Math.round((1-lost/total)*100)));
}
export function methodologyNextAction(o:any,p:any){
 const gaps=methodologyGaps(o,p);return gaps[0]?.action||"Advance the agreed next commitment.";
}

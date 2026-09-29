import "server-only";
import {db} from "./db";
export const opportunityStages=["LEAD","DISCOVERY","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST"] as const;
export async function listOpportunities(brandId?:string){
 const sql=db();
 return brandId?sql`SELECT o.*,b.name brand_name,org.name organization_name,p.first_name,p.last_name,u.display_name owner_name FROM wgos.opportunities o JOIN wgos.brands b ON b.id=o.brand_id LEFT JOIN wgos.organizations org ON org.id=o.organization_id LEFT JOIN wgos.people p ON p.id=o.primary_person_id LEFT JOIN wgos.app_users u ON u.auth_user_id=o.owner_subject WHERE o.brand_id=${brandId} ORDER BY o.updated_at DESC`
 :sql`SELECT o.*,b.name brand_name,org.name organization_name,p.first_name,p.last_name,u.display_name owner_name FROM wgos.opportunities o JOIN wgos.brands b ON b.id=o.brand_id LEFT JOIN wgos.organizations org ON org.id=o.organization_id LEFT JOIN wgos.people p ON p.id=o.primary_person_id LEFT JOIN wgos.app_users u ON u.auth_user_id=o.owner_subject ORDER BY o.updated_at DESC`;
}
export async function commercialSummary(){
 const sql=db();const [pipeline,stages]=await Promise.all([
  sql`SELECT count(*)::int opportunity_count,COALESCE(sum(value_cents),0)::bigint pipeline_cents FROM wgos.opportunities WHERE stage NOT IN ('WON','LOST')`,
  sql`SELECT stage,count(*)::int count,COALESCE(sum(value_cents),0)::bigint value_cents FROM wgos.opportunities GROUP BY stage ORDER BY stage`
 ]);return {pipeline:pipeline[0],stages};
}

export async function createOpportunity(input:{brandId:string;title:string;valueCents?:number;currency?:string;organizationId?:string|null;primaryPersonId?:string|null;ownerSubject?:string|null;source?:string|null;actor:string}){
 const title=input.title.trim();if(!title)throw new Error("Opportunity title is required.");const sql=db();
 const brand=await sql`SELECT id FROM wgos.brands WHERE id=${input.brandId} LIMIT 1`;if(!brand[0])throw new Error("Brand not found.");
 const rows=await sql`INSERT INTO wgos.opportunities(brand_id,organization_id,primary_person_id,title,value_cents,currency,owner_subject,source) VALUES(${input.brandId},${input.organizationId||null}::uuid,${input.primaryPersonId||null}::uuid,${title},${Math.max(0,Math.round(input.valueCents||0))},${(input.currency||"USD").toUpperCase()},${input.ownerSubject||null},${input.source||null}) RETURNING *`;
 const o:any=rows[0];await sql`INSERT INTO wgos.commercial_events(brand_id,opportunity_id,event_type,actor_subject,metadata) VALUES(${input.brandId},${o.id}::uuid,'OPPORTUNITY_CREATED',${input.actor},${JSON.stringify({title,valueCents:o.value_cents})}::jsonb)`;return o;
}
export async function updateOpportunityStage(input:{id:string;stage:string;actor:string;lostReason?:string|null}){
 if(!opportunityStages.includes(input.stage as any))throw new Error("Invalid opportunity stage.");const sql=db();
 const rows=await sql`UPDATE wgos.opportunities SET stage=${input.stage},lost_reason=CASE WHEN ${input.stage}='LOST' THEN ${input.lostReason||null} ELSE lost_reason END,won_at=CASE WHEN ${input.stage}='WON' THEN COALESCE(won_at,now()) ELSE won_at END,closed_at=CASE WHEN ${input.stage} IN ('WON','LOST') THEN COALESCE(closed_at,now()) ELSE NULL END,updated_at=now() WHERE id=${input.id}::uuid RETURNING *`;const o:any=rows[0];if(!o)throw new Error("Opportunity not found.");
 await sql`INSERT INTO wgos.commercial_events(brand_id,opportunity_id,event_type,actor_subject,metadata) VALUES(${o.brand_id},${o.id}::uuid,'STAGE_CHANGED',${input.actor},${JSON.stringify({stage:input.stage})}::jsonb)`;return o;
}

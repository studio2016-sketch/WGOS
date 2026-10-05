import "server-only";
import {db} from "./db";
export const opportunityStages=["NEW","QUALIFYING","DISCOVERY","PROPOSAL","NEGOTIATION","WON","LOST"] as const;
export async function listOpportunities(brandId?:string){
 const sql=db();
 return brandId?sql`SELECT o.*,b.name brand_name,org.name organization_name,c.first_name,c.last_name,u.display_name owner_name FROM wgos.opportunities o JOIN wgos.brands b ON b.id=o.brand_id LEFT JOIN wgos.organizations org ON org.id=o.organization_id LEFT JOIN wgos.contacts c ON c.id=o.primary_contact_id LEFT JOIN wgos.app_users u ON u.auth_user_id=o.owner_subject WHERE o.brand_id=${brandId} AND COALESCE(o.source,'')<>'COMMISSIONING_ARCHIVED' ORDER BY o.updated_at DESC`
 :sql`SELECT o.*,b.name brand_name,org.name organization_name,c.first_name,c.last_name,u.display_name owner_name FROM wgos.opportunities o JOIN wgos.brands b ON b.id=o.brand_id LEFT JOIN wgos.organizations org ON org.id=o.organization_id LEFT JOIN wgos.contacts c ON c.id=o.primary_contact_id LEFT JOIN wgos.app_users u ON u.auth_user_id=o.owner_subject WHERE COALESCE(o.source,'')<>'COMMISSIONING_ARCHIVED' ORDER BY o.updated_at DESC`;
}
export async function commercialSummary(){const sql=db();const [pipeline,stages]=await Promise.all([
 sql`SELECT count(*)::int opportunity_count,COALESCE(sum(estimated_value),0)::numeric pipeline_value FROM wgos.opportunities WHERE stage NOT IN ('WON','LOST')`,
 sql`SELECT stage,count(*)::int count,COALESCE(sum(estimated_value),0)::numeric value FROM wgos.opportunities GROUP BY stage ORDER BY stage`
]);return {pipeline:pipeline[0],stages};}
async function audit(actor:string,action:string,entityType:string,entityId:string,metadata:any={}){const sql=db();await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${actor},${action},${entityType},${entityId},${JSON.stringify(metadata)}::jsonb)`;}
export async function createOpportunity(input:{brandId:string;title:string;valueCents?:number;organizationId?:string|null;primaryContactId?:string|null;ownerSubject?:string|null;source?:string|null;actor:string}){
 const title=input.title.trim();if(!title)throw new Error("Opportunity title is required.");const sql=db();
 const brand=await sql`SELECT id FROM wgos.brands WHERE id=${input.brandId} LIMIT 1`;if(!brand[0])throw new Error("Brand not found.");
 const estimated=Math.max(0,Math.round(input.valueCents||0))/100;
 const rows=await sql`INSERT INTO wgos.opportunities(brand_id,organization_id,primary_contact_id,title,stage,estimated_value,owner_subject,source) VALUES(${input.brandId},${input.organizationId||null}::uuid,${input.primaryContactId||null}::uuid,${title},'NEW',${estimated},${input.ownerSubject||null},${input.source||"manual"}) RETURNING *`;
 const o:any=rows[0];await audit(input.actor,"OPPORTUNITY_CREATED","opportunity",String(o.id),{brandId:o.brand_id,title,estimatedValue:o.estimated_value});return o;
}
export async function updateOpportunityStage(input:{id:string;stage:string;actor:string;lostReason?:string|null}){
 if(!opportunityStages.includes(input.stage as any))throw new Error("Invalid opportunity stage.");const sql=db();
 const rows=await sql`UPDATE wgos.opportunities SET stage=${input.stage},updated_at=now() WHERE id=${input.id}::uuid RETURNING *`;const o:any=rows[0];if(!o)throw new Error("Opportunity not found.");
 await audit(input.actor,"OPPORTUNITY_STAGE_CHANGED","opportunity",String(o.id),{stage:input.stage,lostReason:input.lostReason||null});return o;
}
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

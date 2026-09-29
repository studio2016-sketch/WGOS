import "server-only";import {db} from "./db";
export async function globalSearch(q:string){const term=q.trim();if(term.length<2)return [];const sql=db();const like="%"+term+"%";
 const [people,orgs,opps,projects]=await Promise.all([
 sql`SELECT id::text,'PERSON' kind,concat(first_name,' ',last_name) title,email subtitle,NULL::text brand_id FROM wgos.people WHERE concat(first_name,' ',last_name) ILIKE ${like} OR email ILIKE ${like} LIMIT 20`,
 sql`SELECT id::text,'ORGANIZATION' kind,name title,website subtitle,NULL::text brand_id FROM wgos.organizations WHERE name ILIKE ${like} LIMIT 20`,
 sql`SELECT id::text,'OPPORTUNITY' kind,title,stage subtitle,brand_id FROM wgos.opportunities WHERE title ILIKE ${like} LIMIT 20`,
 sql`SELECT id::text,'PROJECT' kind,title,status subtitle,brand_id FROM wgos.projects WHERE title ILIKE ${like} LIMIT 20`]);
 return [...people,...orgs,...opps,...projects];
}
export async function executiveMetrics(){const sql=db();const [commercial,delivery]=await Promise.all([
 sql`SELECT brand_id,count(*) FILTER(WHERE stage NOT IN ('WON','LOST'))::int open_opportunities,COALESCE(sum(value_cents) FILTER(WHERE stage NOT IN ('WON','LOST')),0)::bigint open_pipeline_cents,count(*) FILTER(WHERE stage='WON')::int won_count FROM wgos.opportunities GROUP BY brand_id`,
 sql`SELECT brand_id,count(*) FILTER(WHERE status IN ('ACTIVE','PLANNING','BLOCKED'))::int active_projects,count(*) FILTER(WHERE status='BLOCKED')::int blocked_projects FROM wgos.projects GROUP BY brand_id`]);return {commercial,delivery};}

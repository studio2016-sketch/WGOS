import "server-only";
import {db} from "./db";

export const marketingStatuses=["NEEDED","REQUESTED","RECEIVED","IN_PRODUCTION","READY","PUBLISHED","BLOCKED","CANCELLED"] as const;
export const marketingPriorities=["LOW","MEDIUM","HIGH","CRITICAL"] as const;
export const marketingTypes=["PHOTO","VIDEO","FLYER","SHOW_INFO","COPY","TESTIMONIAL","AUDIO","PRESS","CALENDAR_ITEM","OFFER","OTHER"] as const;

export async function listMarketingDeliverables(authUserId?:string|null,isGlobal=false,brandId?:string|null){
 const sql=db();
 return authUserId&&!isGlobal
 ? sql`SELECT m.*,b.name brand_name FROM wgos.marketing_deliverables m JOIN wgos.brands b ON b.id=m.brand_id JOIN wgos.brand_memberships bm ON bm.brand_id=m.brand_id AND bm.auth_user_id=${authUserId} AND bm.active=true WHERE (${brandId||null}::text IS NULL OR m.brand_id=${brandId||null}) ORDER BY CASE m.status WHEN 'BLOCKED' THEN 0 WHEN 'NEEDED' THEN 1 WHEN 'REQUESTED' THEN 2 WHEN 'RECEIVED' THEN 3 WHEN 'IN_PRODUCTION' THEN 4 ELSE 5 END,CASE m.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,COALESCE(m.due_at,'9999-12-31'::timestamptz),m.created_at DESC`
 : sql`SELECT m.*,b.name brand_name FROM wgos.marketing_deliverables m JOIN wgos.brands b ON b.id=m.brand_id WHERE (${brandId||null}::text IS NULL OR m.brand_id=${brandId||null}) ORDER BY CASE m.status WHEN 'BLOCKED' THEN 0 WHEN 'NEEDED' THEN 1 WHEN 'REQUESTED' THEN 2 WHEN 'RECEIVED' THEN 3 WHEN 'IN_PRODUCTION' THEN 4 ELSE 5 END,CASE m.priority WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,COALESCE(m.due_at,'9999-12-31'::timestamptz),m.created_at DESC`;
}
export async function createMarketingDeliverable(input:any){
 const sql=db(); const title=String(input.title||"").trim(); if(!title)throw new Error("Title is required.");
 const status=marketingStatuses.includes(input.status) ? input.status : "NEEDED";
 const priority=marketingPriorities.includes(input.priority) ? input.priority : "MEDIUM";
 const type=marketingTypes.includes(input.deliverableType) ? input.deliverableType : "OTHER";
 const rows=await sql`INSERT INTO wgos.marketing_deliverables(brand_id,title,deliverable_type,status,priority,channel,campaign,needed_from,due_at,asset_url,notes,created_by) VALUES(${input.brandId},${title},${type},${status},${priority},${input.channel||null},${input.campaign||null},${input.neededFrom||null},${input.dueAt||null},${input.assetUrl||null},${input.notes||null},${input.actor||null}) RETURNING *`;
 return rows[0];
}
export async function updateMarketingDeliverable(input:any){
 const sql=db(); const status=marketingStatuses.includes(input.status)?input.status:null;
 const priority=marketingPriorities.includes(input.priority)?input.priority:null;
 const rows=await sql`UPDATE wgos.marketing_deliverables SET status=COALESCE(${status},status),priority=COALESCE(${priority},priority),asset_url=COALESCE(${input.assetUrl||null},asset_url),notes=COALESCE(${input.notes||null},notes),updated_at=now() WHERE id=${input.id}::uuid RETURNING *`;
 if(!rows[0])throw new Error("Deliverable not found."); return rows[0];
}

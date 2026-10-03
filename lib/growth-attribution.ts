import "server-only";
import {db} from "./db";

export async function listGrowthCampaigns(authUserId?:string|null,isGlobal=false,brandId?:string|null){
 const sql=db();
 const base=authUserId&&!isGlobal
 ? sql`SELECT c.*,b.name brand_name,
   (SELECT count(*)::int FROM wgos.growth_links l WHERE l.campaign_id=c.id) link_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id) event_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='LIST_SIGNUP') signup_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='INQUIRY') inquiry_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='SALE') sale_count,
   (SELECT coalesce(sum(e.value_cents),0)::bigint FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='SALE') revenue_cents
  FROM wgos.growth_campaigns c JOIN wgos.brands b ON b.id=c.brand_id
  JOIN wgos.brand_memberships bm ON bm.brand_id=c.brand_id AND bm.auth_user_id=${authUserId} AND bm.active=true
  WHERE (${brandId||null}::text IS NULL OR c.brand_id=${brandId||null})
  ORDER BY CASE c.status WHEN 'ACTIVE' THEN 0 WHEN 'DRAFT' THEN 1 WHEN 'PAUSED' THEN 2 ELSE 3 END,c.created_at DESC`
 : sql`SELECT c.*,b.name brand_name,
   (SELECT count(*)::int FROM wgos.growth_links l WHERE l.campaign_id=c.id) link_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id) event_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='LIST_SIGNUP') signup_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='INQUIRY') inquiry_count,
   (SELECT count(*)::int FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='SALE') sale_count,
   (SELECT coalesce(sum(e.value_cents),0)::bigint FROM wgos.growth_events e WHERE e.campaign_id=c.id AND e.event_type='SALE') revenue_cents
  FROM wgos.growth_campaigns c JOIN wgos.brands b ON b.id=c.brand_id
  WHERE (${brandId||null}::text IS NULL OR c.brand_id=${brandId||null})
  ORDER BY CASE c.status WHEN 'ACTIVE' THEN 0 WHEN 'DRAFT' THEN 1 WHEN 'PAUSED' THEN 2 ELSE 3 END,c.created_at DESC`;
 return base;
}

export async function listGrowthLinks(campaignIds:string[]){
 if(!campaignIds.length)return [];
 const sql=db();
 return sql`SELECT * FROM wgos.growth_links WHERE campaign_id=ANY(${campaignIds}::uuid[]) ORDER BY created_at DESC`;
}

export async function createGrowthCampaign(input:any){
 const sql=db();const name=String(input.name||"").trim();if(!name)throw new Error("Campaign name is required.");
 const rows=await sql`INSERT INTO wgos.growth_campaigns(brand_id,name,objective,status,starts_on,ends_on,created_by)
 VALUES(${input.brandId},${name},${input.objective||null},'ACTIVE',${input.startsOn||null},${input.endsOn||null},${input.actor||null}) RETURNING *`;return rows[0];
}

export async function createGrowthLink(input:any){
 const sql=db();const label=String(input.label||"").trim();const destination=String(input.destinationUrl||"").trim();if(!label||!destination)throw new Error("Label and destination URL are required.");
 let u:URL;try{u=new URL(destination);}catch{throw new Error("Destination URL must be valid.");}
 const source=String(input.source||"social").trim().toLowerCase();const medium=String(input.medium||"social").trim().toLowerCase();const campaign=String(input.utmCampaign||input.campaignName||"campaign").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 u.searchParams.set("utm_source",source);u.searchParams.set("utm_medium",medium);u.searchParams.set("utm_campaign",campaign);
 if(input.content)u.searchParams.set("utm_content",String(input.content).trim());if(input.term)u.searchParams.set("utm_term",String(input.term).trim());
 const rows=await sql`INSERT INTO wgos.growth_links(campaign_id,brand_id,label,destination_url,source,medium,content,term,utm_campaign,tagged_url,created_by)
 VALUES(${input.campaignId},${input.brandId},${label},${destination},${source},${medium},${input.content||null},${input.term||null},${campaign},${u.toString()},${input.actor||null}) RETURNING *`;return rows[0];
}

export async function recordGrowthEvent(input:any){
 const sql=db();const type=String(input.eventType||"OTHER").toUpperCase();
 const allowed=["CLICK","WEBSITE_VISIT","VIDEO_VIEW","LIST_SIGNUP","INQUIRY","SALE","RETURN_TO_SOCIAL","OTHER"];
 if(!allowed.includes(type))throw new Error("Invalid growth event.");
 const rows=await sql`INSERT INTO wgos.growth_events(brand_id,campaign_id,link_id,event_type,value_cents,anonymous_id,session_id,referrer,landing_url,metadata,occurred_at)
 VALUES(${input.brandId},${input.campaignId||null},${input.linkId||null},${type},${Math.max(0,Math.floor(Number(input.valueCents)||0))},${input.anonymousId||null},${input.sessionId||null},${input.referrer||null},${input.landingUrl||null},${JSON.stringify(input.metadata||{})}::jsonb,${input.occurredAt||new Date().toISOString()}) RETURNING *`;return rows[0];
}

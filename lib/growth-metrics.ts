import "server-only";
import {db} from "./db";
export const growthPlatforms=["INSTAGRAM","FACEBOOK","TIKTOK","YOUTUBE","WEBSITE","EMAIL_SMS","OTHER"] as const;
export async function listGrowthMetrics(authUserId?:string|null,isGlobal=false,brandId?:string|null){
 const sql=db();
 return authUserId&&!isGlobal
 ? sql`SELECT g.*,b.name brand_name FROM wgos.growth_metric_snapshots g JOIN wgos.brands b ON b.id=g.brand_id JOIN wgos.brand_memberships bm ON bm.brand_id=g.brand_id AND bm.auth_user_id=${authUserId} AND bm.active=true WHERE (${brandId||null}::text IS NULL OR g.brand_id=${brandId||null}) ORDER BY g.period_end DESC,g.created_at DESC LIMIT 500`
 : sql`SELECT g.*,b.name brand_name FROM wgos.growth_metric_snapshots g JOIN wgos.brands b ON b.id=g.brand_id WHERE (${brandId||null}::text IS NULL OR g.brand_id=${brandId||null}) ORDER BY g.period_end DESC,g.created_at DESC LIMIT 500`;
}
export async function createGrowthMetric(input:any){
 const sql=db(); const platform=growthPlatforms.includes(input.platform)?input.platform:"OTHER";
 if(!input.brandId||!input.periodStart||!input.periodEnd)throw new Error("Brand and period are required.");
 const n=(v:any)=>Math.max(0,Math.floor(Number(v)||0));
 const rows=await sql`INSERT INTO wgos.growth_metric_snapshots(
  brand_id,title,platform,account_label,period_start,period_end,followers,impressions,reach,content_views,engagements,outbound_clicks,
  youtube_watch_minutes,website_sessions,list_signups,inquiries,sales_count,revenue_cents,notes,source,created_by
 ) VALUES(
  ${input.brandId},${input.title||null},${platform},${input.accountLabel||null},${input.periodStart},${input.periodEnd},
  ${n(input.followers)},${n(input.impressions)},${n(input.reach)},${n(input.contentViews)},${n(input.engagements)},${n(input.outboundClicks)},
  ${n(input.youtubeWatchMinutes)},${n(input.websiteSessions)},${n(input.listSignups)},${n(input.inquiries)},${n(input.salesCount)},${n(input.revenueCents)},
  ${input.notes||null},${input.source||"MANUAL"},${input.actor||null}
 ) RETURNING *`; return rows[0];
}
export function summarizeGrowth(rows:any[]){
 const s={followers:0,impressions:0,reach:0,views:0,engagements:0,clicks:0,watchMinutes:0,sessions:0,signups:0,inquiries:0,sales:0,revenueCents:0};
 for(const r of rows){s.followers+=Number(r.followers||0);s.impressions+=Number(r.impressions||0);s.reach+=Number(r.reach||0);s.views+=Number(r.content_views||0);s.engagements+=Number(r.engagements||0);s.clicks+=Number(r.outbound_clicks||0);s.watchMinutes+=Number(r.youtube_watch_minutes||0);s.sessions+=Number(r.website_sessions||0);s.signups+=Number(r.list_signups||0);s.inquiries+=Number(r.inquiries||0);s.sales+=Number(r.sales_count||0);s.revenueCents+=Number(r.revenue_cents||0);}
 return s;
}
import {NextResponse} from "next/server";
import {recordGrowthEvent} from "../../../../lib/growth-attribution";
import {db} from "../../../../lib/db";
export async function POST(req:Request){
 try{
  const b=await req.json();
  const eventType=String(b.eventType||'').toUpperCase();
  // Public telemetry cannot establish a sale, a saved inquiry or a list signup.
  if(!['CLICK','WEBSITE_VISIT','VIDEO_VIEW','RETURN_TO_SOCIAL'].includes(eventType))return NextResponse.json({ok:false,error:'SERVER_CONFIRMED_EVENT_REQUIRED'},{status:400});
  let brandId=String(b.brandId||"");let campaignId=b.campaignId?String(b.campaignId):null;let linkId=b.linkId?String(b.linkId):null;
  if(linkId){const sql=db();const rows=await sql`SELECT brand_id,campaign_id FROM wgos.growth_links WHERE id=${linkId}::uuid LIMIT 1`;if(!rows[0])return NextResponse.json({ok:false},{status:404});brandId=String((rows[0] as any).brand_id);campaignId=String((rows[0] as any).campaign_id);}
  if(!brandId)return NextResponse.json({ok:false},{status:400});
  const sql=db();
  const brands=await sql`SELECT 1 FROM wgos.brand_experience_profiles WHERE brand_id=${brandId} LIMIT 1`;
  if(!brands.length)return NextResponse.json({ok:false},{status:404});
  if(campaignId){const campaigns=await sql`SELECT 1 FROM wgos.growth_campaigns WHERE id=${campaignId}::uuid AND brand_id=${brandId} LIMIT 1`;if(!campaigns.length)return NextResponse.json({ok:false},{status:400});}
  await recordGrowthEvent({brandId,campaignId,linkId,eventType,valueCents:0,metadata:{evidence:'PUBLIC_TELEMETRY'}});return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:false},{status:400});}
}

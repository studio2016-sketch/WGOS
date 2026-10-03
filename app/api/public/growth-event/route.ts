import {NextResponse} from "next/server";
import {recordGrowthEvent} from "../../../../lib/growth-attribution";
import {db} from "../../../../lib/db";
export async function POST(req:Request){
 try{
  const b=await req.json();let brandId=String(b.brandId||"");let campaignId=b.campaignId?String(b.campaignId):null;let linkId=b.linkId?String(b.linkId):null;
  if(linkId){const sql=db();const rows=await sql`SELECT brand_id,campaign_id FROM wgos.growth_links WHERE id=${linkId}::uuid LIMIT 1`;if(!rows[0])return NextResponse.json({ok:false},{status:404});brandId=String((rows[0] as any).brand_id);campaignId=String((rows[0] as any).campaign_id);}
  if(!brandId)return NextResponse.json({ok:false},{status:400});
  await recordGrowthEvent({...b,brandId,campaignId,linkId});return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:false},{status:400});}
}

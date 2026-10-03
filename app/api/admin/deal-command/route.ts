import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {upsertDealCommand} from "../../../../lib/deal-command";
import {db} from "../../../../lib/db";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json();const opportunityId=String(b.opportunityId||"");const sql=db();const rows=await sql`SELECT brand_id FROM wgos.opportunities WHERE id=${opportunityId}::uuid LIMIT 1`;if(!rows[0])return NextResponse.json({ok:false,error:"Opportunity not found"},{status:404});
 const brandId=String((rows[0] as any).brand_id);const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const row=await upsertDealCommand({...b,opportunityId,actor:String((auth.identity as any).auth_user_id)});return NextResponse.json({ok:true,row});}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to save deal profile"},{status:400});}
}

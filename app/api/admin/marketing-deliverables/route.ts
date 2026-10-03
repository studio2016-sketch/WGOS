import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {createMarketingDeliverable,updateMarketingDeliverable} from "../../../../lib/marketing-deliverables";
import {db} from "../../../../lib/db";

export async function POST(req:Request){
 const auth=await requireApiUser(); if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json(); const brandId=String(b.brandId||""); const access=await requireApiBrandAdmin(auth.identity,brandId); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const row=await createMarketingDeliverable({...b,brandId,actor:String((auth.identity as any).auth_user_id)}); return NextResponse.json({ok:true,row});}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to create deliverable"},{status:400});}
}
export async function PATCH(req:Request){
 const auth=await requireApiUser(); if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json(); const sql=db(); const rows=await sql`SELECT brand_id FROM wgos.marketing_deliverables WHERE id=${String(b.id||"")}::uuid LIMIT 1`; if(!rows[0])return NextResponse.json({ok:false,error:"Deliverable not found."},{status:404});
 const access=await requireApiBrandAdmin(auth.identity,String((rows[0] as any).brand_id)); if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const row=await updateMarketingDeliverable(b); return NextResponse.json({ok:true,row});}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update deliverable"},{status:400});}
}

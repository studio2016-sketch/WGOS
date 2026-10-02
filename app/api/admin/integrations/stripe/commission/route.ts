import {NextResponse} from "next/server";
import {requireApiAdmin,requireApiBrand} from "../../../../../../lib/authz";
import {commissionBrandStripe} from "../../../../../../lib/stripe-commissioning";

export async function POST(req:Request){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json();const brandId=String(body?.brandId||"").trim();
  if(!brandId)return NextResponse.json({ok:false,error:"BRAND_REQUIRED"},{status:400});
  const access=await requireApiBrand(auth.identity,brandId);
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const result=await commissionBrandStripe({brandId,actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Stripe commissioning failed"},{status:400,headers:{"Cache-Control":"no-store, private"}});}
}
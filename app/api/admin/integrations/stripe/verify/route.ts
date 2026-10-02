import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../lib/authz";
import {verifyStripeConnection,verifyStripeEnv} from "../../../../../../lib/stripe";
import {recordIntegrationVerification} from "../../../../../../lib/integration-registry";
import {db} from "../../../../../../lib/db";
export const dynamic="force-dynamic";

export async function GET(req:Request){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({provider:"stripe",connected:false,error:auth.error},{status:auth.status});
 const brand=new URL(req.url).searchParams.get("brand")||"";
 try{
  if(brand){
   const sql=db();const rows:any[]=await sql`SELECT secret_env_var,payment_mode,complete_for_payment FROM wgos.brand_payment_profiles WHERE brand_id=${brand} LIMIT 1`;const p=rows[0];
   if(!p)return NextResponse.json({provider:"stripe",brand,connected:false,error:"PAYMENT_PROFILE_NOT_FOUND"},{status:404});
   const result=await verifyStripeEnv(String(p.secret_env_var||""));
   await recordIntegrationVerification({provider:"stripe",capability:"payments",brandId:brand,connected:true,metadata:{mode:result.mode,paymentMode:p.payment_mode,completeForPayment:Boolean(p.complete_for_payment)}});
   return NextResponse.json({provider:"stripe",brand,connected:true,mode:result.mode,paymentMode:p.payment_mode,completeForPayment:Boolean(p.complete_for_payment)});
  }
  const result=await verifyStripeConnection();
  await recordIntegrationVerification({provider:"stripe",capability:"payments",connected:true,metadata:{mode:result.mode}});
  return NextResponse.json({provider:"stripe",connected:true,mode:result.mode});
 }catch{
  try{await recordIntegrationVerification({provider:"stripe",capability:"payments",brandId:brand||null,connected:false,error:"PROVIDER_VERIFICATION_FAILED"});}catch{}
  return NextResponse.json({provider:"stripe",brand:brand||undefined,connected:false,error:"PROVIDER_VERIFICATION_FAILED"},{status:503});
 }
}
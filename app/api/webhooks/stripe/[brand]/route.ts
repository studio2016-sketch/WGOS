import {NextResponse} from "next/server";
import {stripeBrandRuntime} from "../../../../../lib/stripe-brand";
import {recordStripeCheckoutPayment} from "../../../../../lib/stripe-checkout";
export const runtime="nodejs";
export async function POST(req:Request,{params}:{params:Promise<{brand:string}>}){
 const headers={"Cache-Control":"no-store, private"};
 const {brand}=await params;
 const signature=req.headers.get("stripe-signature");
 if(!signature)return NextResponse.json({ok:false,error:"SIGNATURE_REQUIRED"},{status:400,headers});
 try{
  const runtime=await stripeBrandRuntime(brand);
  const raw=await req.text();
  const event=runtime.client.webhooks.constructEvent(raw,signature,runtime.webhookSecret);
  if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
   const session:any=event.data.object;
   if(String(session?.metadata?.wgos_brand_id||"")!==String(brand))
    return NextResponse.json({ok:false,error:"BRAND_MISMATCH"},{status:409,headers});
   await recordStripeCheckoutPayment(String(session.id),brand);
  }
  return NextResponse.json({received:true},{headers});
 }catch{
  return NextResponse.json({ok:false,error:"WEBHOOK_REJECTED"},{status:400,headers});
 }
}
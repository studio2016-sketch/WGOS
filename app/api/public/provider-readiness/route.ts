import {NextResponse} from "next/server";
import {verifySignWellConnection} from "../../../../lib/signwell";
import {stripeConfigured,verifyStripeConnection} from "../../../../lib/stripe";
export const dynamic="force-dynamic";
export async function GET(){
 const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
 const result:any={signwell:{configured:Boolean(process.env.SIGNWELL_API_KEY),connected:false,status:null},stripe:{configured:stripeConfigured(),connected:false}};
 if(result.signwell.configured){
  try{const x=await verifySignWellConnection();result.signwell.connected=x.connected;result.signwell.status=x.status}catch{}
 }
 if(result.stripe.configured){
  try{await verifyStripeConnection();result.stripe.connected=true}catch{}
 }
 return NextResponse.json({ok:true,...result},{headers});
}
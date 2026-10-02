import {NextResponse} from "next/server";
import {verifySignWellConnection,signWellWebhookReadiness,signWellMode,ensureSignWellWebhook} from "../../../../lib/signwell";
import {stripeConfigured,verifyStripeConnection} from "../../../../lib/stripe";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
 const ensureWebhook=new URL(req.url).searchParams.get("ensureWebhook")==="1";
 const result:any={signwell:{configured:Boolean(process.env.SIGNWELL_API_KEY),connected:false,status:null,mode:signWellMode(),webhookConfigured:false,webhookStatus:null,webhookCreated:false},stripe:{configured:stripeConfigured(),connected:false}};
 if(result.signwell.configured){
  try{const x=await verifySignWellConnection();result.signwell.connected=x.connected;result.signwell.status=x.status;if(x.connected){const w=ensureWebhook?await ensureSignWellWebhook():await signWellWebhookReadiness();result.signwell.webhookConfigured=w.configured;result.signwell.webhookStatus=w.status;result.signwell.webhookCreated=Boolean((w as any).created)}}catch{}
 }
 if(result.stripe.configured){
  try{await verifyStripeConnection();result.stripe.connected=true}catch{}
 }
 return NextResponse.json({ok:true,...result},{headers});
}
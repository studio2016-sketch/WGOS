import {NextResponse} from "next/server";
import {stripe} from "../../../../lib/stripe";
import {recordStripeCheckoutPayment} from "../../../../lib/stripe-checkout";
export const runtime="nodejs";
export async function POST(req:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;if(!secret)return NextResponse.json({ok:false,error:"WEBHOOK_NOT_CONFIGURED"},{status:503});
 const signature=req.headers.get("stripe-signature");if(!signature)return NextResponse.json({ok:false,error:"SIGNATURE_REQUIRED"},{status:400});
 try{const event=stripe().webhooks.constructEvent(await req.text(),signature,secret);if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded")await recordStripeCheckoutPayment(event.data.object.id);return NextResponse.json({received:true});}
 catch{return NextResponse.json({ok:false,error:"WEBHOOK_REJECTED"},{status:400});}
}

import "server-only";
import Stripe from "stripe";

export function stripeConfigured(){return Boolean(process.env.STRIPE_SECRET_KEY);}

export function stripe(){
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw new Error("STRIPE_SECRET_KEY is not configured");
 return new Stripe(key,{apiVersion:"2026-08-26.dahlia"});
}

export async function verifyStripeConnection(){
 const client=stripe();
 await client.balance.retrieve();
 return {connected:true};
}

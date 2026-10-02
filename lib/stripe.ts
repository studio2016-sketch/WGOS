import "server-only";
import Stripe from "stripe";

export function stripeConfigured(){return Boolean(process.env.STRIPE_SECRET_KEY);}
export function stripeMode(){return stripeKeyMode(String(process.env.STRIPE_SECRET_KEY||""));}

export function stripeKeyMode(key:string){return key.startsWith("sk_live_")?"LIVE":key.startsWith("sk_test_")?"TEST":"UNKNOWN";}

export function stripeFromKey(key:string){
 if(!key)throw new Error("Stripe secret key is not configured");
 return new Stripe(key,{apiVersion:"2026-08-26.dahlia"});
}

export function stripeForEnv(envVarName:string){
 const name=String(envVarName||"").trim();
 if(!name)throw new Error("Stripe secret environment variable is not configured for this brand.");
 const key=process.env[name];
 if(!key)throw new Error(`${name} is not configured`);
 return stripeFromKey(key);
}

export function stripeModeForEnv(envVarName:string){
 const name=String(envVarName||"").trim();return stripeKeyMode(name?String(process.env[name]||""):"");
}

export function stripe(){
 const key=process.env.STRIPE_SECRET_KEY;
 if(!key)throw new Error("STRIPE_SECRET_KEY is not configured");
 return stripeFromKey(key);
}

export async function verifyStripeConnection(){
 const client=stripe();
 await client.balance.retrieve();
 return {connected:true,mode:stripeMode()};
}

export async function verifyStripeEnv(envVarName:string){
 const client=stripeForEnv(envVarName);await client.balance.retrieve();return {connected:true,mode:stripeModeForEnv(envVarName)};
}
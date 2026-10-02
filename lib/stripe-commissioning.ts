import "server-only";
import {db} from "./db";
import {verifyStripeEnv} from "./stripe";
import {recordIntegrationVerification} from "./integration-registry";

export async function commissionBrandStripe(input:{brandId:string;actor:string}){
 const sql=db();
 const rows:any[]=await sql`SELECT p.brand_id,p.payment_mode,p.complete_for_payment,p.secret_env_var,p.webhook_secret_env_var,x.public_domain
  FROM wgos.brand_payment_profiles p LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=p.brand_id
  WHERE p.brand_id=${input.brandId} LIMIT 1`;
 const p=rows[0];if(!p)throw new Error("Brand payment profile not found.");
 if(String(p.payment_mode)==="EXTERNAL")throw new Error("This brand uses an external payment relationship.");
 if(!p.public_domain)throw new Error("A public brand domain is required before live payments can be commissioned.");
 const secretName=String(p.secret_env_var||""),webhookName=String(p.webhook_secret_env_var||"");
 if(!secretName||!webhookName)throw new Error("Brand Stripe environment variable names are not configured.");
 if(!process.env[webhookName])throw new Error(webhookName+" is not configured.");
 const verified=await verifyStripeEnv(secretName);
 if(verified.mode!=="LIVE")throw new Error("A live Stripe secret key is required for production commissioning.");
 await sql`UPDATE wgos.brand_payment_profiles SET payment_mode='DIRECT_STRIPE_ACCOUNT',complete_for_payment=true,updated_at=now() WHERE brand_id=${input.brandId}`;
 await recordIntegrationVerification({provider:"stripe",capability:"payments",brandId:input.brandId,connected:true,metadata:{mode:verified.mode,commissioned:true,webhookConfigured:true}});
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
  VALUES(${input.actor},'STRIPE_BRAND_COMMISSIONED','brand',${input.brandId},jsonb_build_object('mode',${verified.mode},'webhookEnv',${webhookName}))`;
 return {ok:true,brandId:input.brandId,mode:verified.mode,paymentMode:"DIRECT_STRIPE_ACCOUNT",completeForPayment:true};
}
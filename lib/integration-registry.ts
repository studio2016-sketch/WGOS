import "server-only";
import {db} from "./db";

export async function recordIntegrationVerification(input:{provider:string;capability:string;connected:boolean;brandId?:string|null;error?:string|null;metadata?:Record<string,unknown>}){
 const sql=db(),brandId=input.brandId||null;
 const existing:any[]=brandId
  ?await sql`SELECT id FROM wgos.integration_registry WHERE brand_id=${brandId} AND provider=${input.provider} AND capability=${input.capability} ORDER BY updated_at DESC LIMIT 1`
  :await sql`SELECT id FROM wgos.integration_registry WHERE brand_id IS NULL AND provider=${input.provider} AND capability=${input.capability} ORDER BY updated_at DESC LIMIT 1`;
 const status=input.connected?"CONNECTED":"ERROR",err=input.connected?null:String(input.error||"PROVIDER_VERIFICATION_FAILED");
 const metadata=JSON.stringify(input.metadata||{});
 if(existing[0]){
  await sql`UPDATE wgos.integration_registry SET status=${status},last_verified_at=now(),last_error=${err},metadata=COALESCE(metadata,'{}'::jsonb)||${metadata}::jsonb,updated_at=now() WHERE id=${existing[0].id}::uuid`;
 }else{
  await sql`INSERT INTO wgos.integration_registry(brand_id,provider,capability,status,last_verified_at,last_error,metadata)
   VALUES(${brandId},${input.provider},${input.capability},${status},now(),${err},${metadata}::jsonb)`;
 }
 return {provider:input.provider,capability:input.capability,brandId,status};
}

export async function globalIntegrationStates(){
 const sql=db();
 return sql`SELECT DISTINCT ON (provider,capability) provider,capability,status,last_verified_at,last_error,metadata
 FROM wgos.integration_registry WHERE brand_id IS NULL
 ORDER BY provider,capability,updated_at DESC`;
}

export async function brandPaymentCommissioning(){
 const sql=db();
 return sql`SELECT b.id brand_id,b.name brand_name,p.payment_mode,p.complete_for_payment,p.secret_env_var,p.webhook_secret_env_var,
  CASE WHEN p.secret_env_var IS NOT NULL AND p.secret_env_var<>'' THEN true ELSE false END secret_named,
  CASE WHEN p.webhook_secret_env_var IS NOT NULL AND p.webhook_secret_env_var<>'' THEN true ELSE false END webhook_named,
  i.status integration_status,i.last_verified_at,i.last_error,i.metadata integration_metadata
 FROM wgos.brands b
 LEFT JOIN wgos.brand_payment_profiles p ON p.brand_id=b.id
 LEFT JOIN LATERAL (
  SELECT status,last_verified_at,last_error,metadata FROM wgos.integration_registry
  WHERE brand_id=b.id AND provider='stripe' AND capability='payments'
  ORDER BY updated_at DESC LIMIT 1
 ) i ON true
 ORDER BY b.name`;
}
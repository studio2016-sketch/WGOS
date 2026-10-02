import "server-only";
import {db} from "./db";

export async function recordIntegrationVerification(input:{provider:string;capability:string;connected:boolean;error?:string|null}){
 const sql=db();
 const existing:any[]=await sql`SELECT id FROM wgos.integration_registry WHERE brand_id IS NULL AND provider=${input.provider} AND capability=${input.capability} ORDER BY updated_at DESC LIMIT 1`;
 const status=input.connected?"CONNECTED":"ERROR",err=input.connected?null:String(input.error||"PROVIDER_VERIFICATION_FAILED");
 if(existing[0]){
  await sql`UPDATE wgos.integration_registry SET status=${status},last_verified_at=now(),last_error=${err},updated_at=now() WHERE id=${existing[0].id}::uuid`;
 }else{
  await sql`INSERT INTO wgos.integration_registry(brand_id,provider,capability,status,last_verified_at,last_error,metadata)
   VALUES(NULL,${input.provider},${input.capability},${status},now(),${err},'{}'::jsonb)`;
 }
 return {provider:input.provider,capability:input.capability,status};
}

export async function globalIntegrationStates(){
 const sql=db();
 return sql`SELECT DISTINCT ON (provider,capability) provider,capability,status,last_verified_at,last_error
 FROM wgos.integration_registry WHERE brand_id IS NULL
 ORDER BY provider,capability,updated_at DESC`;
}
import "server-only";
import {db} from "./db";

export async function recordSystemHealth(input:{component:string;status:string;details?:Record<string,unknown>;correlationId?:string|null}){
 const sql=db();
 const component=String(input.component||"unknown").slice(0,120);
 const status=String(input.status||"UNKNOWN").slice(0,60);
 const details=input.details&&typeof input.details==="object"?input.details:{};
 await sql`INSERT INTO wgos.system_health_events(component,status,correlation_id,details)
  VALUES(${component},${status},${input.correlationId||null},${JSON.stringify(details)}::jsonb)`;
}

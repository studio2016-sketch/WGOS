import "server-only";
import {db} from "./db";
import {agentDefinitions} from "./agent-registry";

function def(id:string){const d=agentDefinitions.find(x=>x.id===id);if(!d)throw new Error("UNKNOWN_AGENT");return d}

export async function startAgentRun(input:{agentId:string;brandId?:string|null;requestedBy?:string|null;objective:string}){
 const a=def(input.agentId);const sql=db();
 await sql`INSERT INTO wgos.agent_definitions(id,name,domain,purpose,risk_class,mode,active,config)
 VALUES(${a.id},${a.name},${a.domain},${a.purpose},${a.riskClass},${a.mode.toUpperCase()},true,${JSON.stringify({checks:a.checks,status:a.status})}::jsonb)
 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,domain=EXCLUDED.domain,purpose=EXCLUDED.purpose,risk_class=EXCLUDED.risk_class,mode=EXCLUDED.mode,config=EXCLUDED.config,updated_at=now()`;
 const rows:any[]=await sql`INSERT INTO wgos.agent_runs(agent_id,brand_id,requested_by,status,risk_class,objective,started_at)
 VALUES(${a.id},${input.brandId||null},${input.requestedBy||null},'RUNNING',${a.riskClass},${input.objective},now()) RETURNING id,created_at`;
 const run=rows[0];await addAgentEvent(run.id,"RUN_STARTED","SYSTEM",input.requestedBy||null,{objective:input.objective});return run;
}
export async function addAgentEvent(runId:string,eventType:string,actorType:"AGENT"|"USER"|"SYSTEM"|"TOOL",actorId:string|null,payload:unknown){
 const sql=db();await sql`INSERT INTO wgos.agent_events(run_id,event_type,actor_type,actor_id,payload) VALUES(${runId},${eventType},${actorType},${actorId},${JSON.stringify(payload??{})}::jsonb)`;
}
export async function addAgentMetric(runId:string,name:string,value:number|null,unit?:string|null,metadata?:unknown){
 const sql=db();await sql`INSERT INTO wgos.agent_metrics(run_id,metric_name,metric_value,unit,metadata) VALUES(${runId},${name},${value},${unit||null},${JSON.stringify(metadata??{})}::jsonb)`;
}
export async function finishAgentRun(runId:string,status:"SUCCEEDED"|"FAILED",payload?:unknown){
 const sql=db();await sql`UPDATE wgos.agent_runs SET status=${status},completed_at=now() WHERE id=${runId}`;await addAgentEvent(runId,status==="SUCCEEDED"?"RUN_SUCCEEDED":"RUN_FAILED","SYSTEM",null,payload??{});
}
export async function listAgentRuns(brandIds:string[],isGlobal:boolean,limit=30){
 const sql=db();if(isGlobal)return await sql`SELECT r.id,r.agent_id,r.brand_id,r.status,r.risk_class,r.objective,r.started_at,r.completed_at,r.created_at,b.name brand_name FROM wgos.agent_runs r LEFT JOIN wgos.brands b ON b.id=r.brand_id ORDER BY r.created_at DESC LIMIT ${limit}`;
 if(!brandIds.length)return [];return await sql`SELECT r.id,r.agent_id,r.brand_id,r.status,r.risk_class,r.objective,r.started_at,r.completed_at,r.created_at,b.name brand_name FROM wgos.agent_runs r LEFT JOIN wgos.brands b ON b.id=r.brand_id WHERE r.brand_id=ANY(${brandIds}) ORDER BY r.created_at DESC LIMIT ${limit}`;
}

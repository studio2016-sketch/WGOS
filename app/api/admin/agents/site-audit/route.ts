import {NextResponse} from "next/server";
import {requireApiUser,canAccessBrand} from "../../../../../lib/authz";
import {db} from "../../../../../lib/db";
import {auditPublicSite} from "../../../../../lib/agent-audits";
import {agentSchemaReady,startAgentRun,addAgentEvent,addAgentMetric,finishAgentRun} from "../../../../../lib/agent-runs";

export async function GET(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 const brandId=new URL(req.url).searchParams.get("brand")||"";
 if(!brandId)return NextResponse.json({ok:false,error:"BRAND_REQUIRED"},{status:400});
 if(!await canAccessBrand(auth.identity,brandId))return NextResponse.json({ok:false,error:"BRAND_ACCESS_REQUIRED"},{status:403});
 const sql=db();
 const rows:any[]=await sql`SELECT b.id,b.name,p.public_domain FROM wgos.brands b LEFT JOIN wgos.brand_experience_profiles p ON p.brand_id=b.id WHERE b.id=${brandId} LIMIT 1`;
 const brand=rows[0];
 if(!brand)return NextResponse.json({ok:false,error:"BRAND_NOT_FOUND"},{status:404});
 if(!brand.public_domain)return NextResponse.json({ok:false,error:"PUBLIC_DOMAIN_NOT_CONFIGURED",brand:{id:brand.id,name:brand.name}},{status:409});
 let run:any=null;
 try{
  const durable=await agentSchemaReady();
  if(durable)run=await startAgentRun({agentId:"technical-qa",brandId,requestedBy:auth.identity.auth_user_id,objective:"Read-only public-site technical and discovery baseline"});
  const audit=await auditPublicSite(String(brand.public_domain));
  if(run){
   await addAgentEvent(run.id,"AUDIT_RESULT","AGENT","technical-qa",{url:audit.url,httpStatus:audit.httpStatus,findings:audit.findings});
   await addAgentMetric(run.id,"response_latency_ms",audit.latencyMs,"ms");
   await addAgentMetric(run.id,"failed_checks",audit.findings.filter(x=>x.status==="FAIL").length,"checks");
   await addAgentMetric(run.id,"warning_checks",audit.findings.filter(x=>x.status==="WARN").length,"checks");
   await finishAgentRun(run.id,"SUCCEEDED",{findingCount:audit.findings.length});
  }
  return NextResponse.json({ok:true,brand:{id:brand.id,name:brand.name},audit,runId:run?.id||null,durable},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){
  if(run)await finishAgentRun(run.id,"FAILED",{error:e instanceof Error?e.message:"AUDIT_FAILED"});
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"AUDIT_FAILED"},{status:500});
 }
}

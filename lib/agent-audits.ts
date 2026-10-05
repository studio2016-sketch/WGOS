import "server-only";

export type SiteAuditFinding={check:string;status:"PASS"|"WARN"|"FAIL";detail:string};
export type SiteAuditResult={
 url:string;checkedAt:string;httpStatus:number|null;latencyMs:number|null;
 title:string|null;description:string|null;canonical:string|null;lang:string|null;
 findings:SiteAuditFinding[];
};

function textMatch(html:string,re:RegExp){const m=html.match(re);return m?.[1]?.replace(/\s+/g," ").trim()||null}
function attr(tag:string,name:string){const m=tag.match(new RegExp("\\b"+name+"=[\\\"']([^\\\"']+)[\\\"']","i"));return m?.[1]?.trim()||null}

function assertPublicUrl(url:URL){
 const h=url.hostname.toLowerCase().replace(/^\\[|\\]$/g,"");
 if(h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h==="::1"||h==="0.0.0.0")throw new Error("Private/internal hosts are not auditable.");
 const v4=h.match(/^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/);
 if(v4){const [a,b,c,d]=v4.slice(1).map(Number);if([a,b,c,d].some(n=>n>255))throw new Error("Invalid IPv4 host.");if(a===10||a===127||a===0||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168))throw new Error("Private/internal hosts are not auditable.");}
 if(h.startsWith("fc")||h.startsWith("fd")||h.startsWith("fe80:"))throw new Error("Private/internal hosts are not auditable.");
}
async function publicFetch(start:URL){
 let current=new URL(start);for(let i=0;i<6;i++){assertPublicUrl(current);const r=await fetch(current,{redirect:"manual",cache:"no-store",headers:{"user-agent":"WGOS-ReadOnly-Audit/1.0"},signal:AbortSignal.timeout(12000)});if(![301,302,303,307,308].includes(r.status))return r;const location=r.headers.get("location");if(!location)return r;current=new URL(location,current);}
 throw new Error("Too many redirects.");
}

export async function auditPublicSite(input:string):Promise<SiteAuditResult>{
 const raw=String(input||"").trim();if(!raw)throw new Error("Site URL is required.");
 const url=new URL(raw.startsWith("http")?raw:"https://"+raw);\n if(!["http:","https:"].includes(url.protocol))throw new Error("Only public HTTP(S) sites may be audited.");assertPublicUrl(url);
 const started=Date.now();let response:Response;
 try{response=await publicFetch(url)}
 catch(e){return {url:url.toString(),checkedAt:new Date().toISOString(),httpStatus:null,latencyMs:Date.now()-started,title:null,description:null,canonical:null,lang:null,findings:[{check:"Reachability",status:"FAIL",detail:e instanceof Error?e.message:"Site request failed."}]}}
 const latencyMs=Date.now()-started;const type=response.headers.get("content-type")||"";
 if(!type.includes("text/html"))return {url:response.url||url.toString(),checkedAt:new Date().toISOString(),httpStatus:response.status,latencyMs,title:null,description:null,canonical:null,lang:null,findings:[{check:"HTML",status:"FAIL",detail:"Expected an HTML document."}]};
 const html=(await response.text()).slice(0,2_000_000);
 const title=textMatch(html,/<title[^>]*>([\s\S]*?)<\/title>/i);
 const description=textMatch(html,/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)||textMatch(html,/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
 const canonicalTag=html.match(/<link[^>]+rel=["'][^"']*canonical[^"']*["'][^>]*>/i)?.[0]||"";
 const canonical=canonicalTag?attr(canonicalTag,"href"):null;
 const htmlTag=html.match(/<html\b[^>]*>/i)?.[0]||"";const lang=htmlTag?attr(htmlTag,"lang"):null;
 const h1Count=(html.match(/<h1\b/gi)||[]).length;
 const viewport=/<meta[^>]+name=["']viewport["']/i.test(html);
 const robotsNoIndex=/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)||/<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
 const jsonLd=(html.match(/type=["']application\/ld\+json["']/gi)||[]).length;
 const findings:SiteAuditFinding[]=[
  {check:"HTTP",status:response.ok?"PASS":"FAIL",detail:"HTTP "+response.status},
  {check:"Latency",status:latencyMs<1500?"PASS":latencyMs<3000?"WARN":"FAIL",detail:latencyMs+" ms server response"},
  {check:"Title",status:title&&title.length>=20&&title.length<=70?"PASS":title?"WARN":"FAIL",detail:title?title.length+" characters":"Missing title"},
  {check:"Meta description",status:description&&description.length>=70&&description.length<=180?"PASS":description?"WARN":"FAIL",detail:description?description.length+" characters":"Missing meta description"},
  {check:"Canonical",status:canonical?"PASS":"WARN",detail:canonical||"No canonical link detected"},
  {check:"Language",status:lang?"PASS":"WARN",detail:lang||"No html lang attribute detected"},
  {check:"Viewport",status:viewport?"PASS":"FAIL",detail:viewport?"Viewport declared":"Viewport metadata missing"},
  {check:"Primary heading",status:h1Count===1?"PASS":h1Count===0?"FAIL":"WARN",detail:h1Count+" H1 element(s)"},
  {check:"Indexability",status:robotsNoIndex?"FAIL":"PASS",detail:robotsNoIndex?"noindex directive detected":"No page-level noindex detected"},
  {check:"Structured data",status:jsonLd>0?"PASS":"WARN",detail:jsonLd+" JSON-LD block(s)"}
 ];
 return {url:response.url||url.toString(),checkedAt:new Date().toISOString(),httpStatus:response.status,latencyMs,title,description,canonical,lang,findings};
}

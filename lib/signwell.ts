import "server-only";

const SIGNWELL_API_BASE="https://www.signwell.com/api/v1";

function apiKey(){
 const key=process.env.SIGNWELL_API_KEY;
 if(!key)throw new Error("SIGNWELL_API_KEY is not configured");
 return key;
}
function safeJson(text:string){try{return JSON.parse(text)}catch{return {}}}

export function signWellConfigured(){return Boolean(process.env.SIGNWELL_API_KEY);}
export function signWellMode(){return process.env.SIGNWELL_TEST_MODE==="false"?"LIVE":"TEST";}

export async function verifySignWellConnection(){
 const response=await fetch(`${SIGNWELL_API_BASE}/me`,{method:"GET",headers:{"X-Api-Key":apiKey(),Accept:"application/json"},cache:"no-store"});
 if(!response.ok)return {connected:false,status:response.status,mode:signWellMode()};
 return {connected:true,status:response.status,mode:signWellMode()};
}

export async function signWellWebhookReadiness(){
 const expected=String(process.env.SIGNWELL_WEBHOOK_URL||"https://wgos.app/api/webhooks/signwell").replace(/\/$/,"");
 const response=await fetch(`${SIGNWELL_API_BASE}/hooks`,{method:"GET",headers:{"X-Api-Key":apiKey(),Accept:"application/json"},cache:"no-store"});
 const text=await response.text(),data:any=safeJson(text);
 if(!response.ok)return {configured:false,status:response.status,expected};
 const rows=Array.isArray(data)?data:Array.isArray(data?.hooks)?data.hooks:Array.isArray(data?.data)?data.data:[];
 const match=rows.find((x:any)=>String(x?.callback_url||x?.url||"").replace(/\/$/,"")===expected);
 return {configured:Boolean(match),status:response.status,expected,hookId:match?.id?String(match.id):null};
}

export async function ensureSignWellWebhook(){
 const expected=String(process.env.SIGNWELL_WEBHOOK_URL||"https://wgos.app/api/webhooks/signwell").replace(/\/$/,"");
 const current=await signWellWebhookReadiness();
 if(current.configured)return {configured:true,created:false,status:current.status,expected,hookId:current.hookId||null};
 const response=await fetch(`${SIGNWELL_API_BASE}/hooks`,{method:"POST",headers:{"X-Api-Key":apiKey(),"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({callback_url:expected}),cache:"no-store"});
 const text=await response.text(),data:any=safeJson(text);
 if(!response.ok)throw new Error(`SignWell webhook registration failed (${response.status}).`);
 return {configured:true,created:true,status:response.status,expected,hookId:data?.id?String(data.id):null};
}

export async function createSignWellAgreementDocument(input:{
 agreementId:string;agreementHash:string;proposalId:string;snapshotHash:string;
 title:string;brandName:string;organizationName?:string|null;clientName:string;clientEmail:string;
 termsTitle:string;termsVersion:string;termsBody:string;
}){
 const testMode=process.env.SIGNWELL_TEST_MODE!=="false";
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(input.title)}</title>
 <style>body{font-family:Arial,sans-serif;line-height:1.55;color:#111;padding:40px}h1{font-size:28px;margin-bottom:6px}h2{font-size:18px;margin-top:30px}small{color:#666}pre{white-space:pre-wrap;font:inherit}</style></head><body>
 <p><strong>${escapeHtml(input.brandName)}</strong></p><h1>${escapeHtml(input.title)}</h1>
 ${input.organizationName?`<p>Prepared for ${escapeHtml(input.organizationName)}</p>`:""}
 <h2>${escapeHtml(input.termsTitle||"Agreement Terms")}</h2><small>Terms version ${escapeHtml(input.termsVersion)}</small>
 <pre>${escapeHtml(input.termsBody)}</pre><hr><small>WGOS Agreement Fingerprint: ${escapeHtml(input.agreementHash)}</small></body></html>`;
 const payload={
  test_mode:testMode,
  name:input.title,
  subject:`${input.brandName} — ${input.title}`,
  message:"Please review and complete your agreement.",
  recipients:[{id:"1",name:input.clientName,email:input.clientEmail}],
  files:[{name:"agreement.html",file_base64:Buffer.from(html,"utf8").toString("base64")}],
  embedded_signing:true,
  embedded_signing_notifications:true,
  with_signature_page:true,
  metadata:{agreement_id:input.agreementId,agreement_hash:input.agreementHash,proposal_id:input.proposalId,snapshot_hash:input.snapshotHash}
 };
 const response=await fetch(`${SIGNWELL_API_BASE}/documents`,{method:"POST",headers:{"X-Api-Key":apiKey(),"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(payload),cache:"no-store"});
 const text=await response.text(),data:any=safeJson(text);
 if(!response.ok)throw new Error(`SignWell document creation failed (${response.status}).`);
 const recipient=Array.isArray(data.recipients)?data.recipients[0]:null;
 const url=recipient?.embedded_signing_url||null;
 if(!data.id||!url)throw new Error("SignWell did not return an embedded signing URL.");
 return {externalId:String(data.id),status:String(data.status||"sent"),url:String(url),testMode};
}

export async function getSignWellDocument(externalId:string){
 const response=await fetch(`${SIGNWELL_API_BASE}/documents/${encodeURIComponent(externalId)}`,{headers:{"X-Api-Key":apiKey(),Accept:"application/json"},cache:"no-store"});
 const text=await response.text(),data:any=safeJson(text);
 if(!response.ok)throw new Error(`Unable to read SignWell document (${response.status}).`);
 return data;
}

function escapeHtml(value:unknown){
 return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]||ch));
}
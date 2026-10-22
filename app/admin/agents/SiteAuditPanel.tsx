"use client";
import {useState} from "react";

export default function SiteAuditPanel({brands,initialBrand}:{brands:any[];initialBrand:string}){
 const [brand,setBrand]=useState(initialBrand||brands[0]?.id||"");const [state,setState]=useState<any>(null);const [loading,setLoading]=useState(false);
 async function run(){if(!brand)return;setLoading(true);setState(null);try{const r=await fetch("/api/admin/agents/site-audit?brand="+encodeURIComponent(brand),{cache:"no-store"});setState(await r.json())}catch(e){setState({ok:false,error:e instanceof Error?e.message:"AUDIT_FAILED"})}finally{setLoading(false)}}
 return <div>
  <div className="filterRow"><label>Brand <select value={brand} onChange={e=>setBrand(e.target.value)}>{brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><button className="primaryButton" onClick={run} disabled={!brand||loading}>{loading?"Inspecting…":"Run read-only audit"}</button></div>
  {!state&&<p>No site inspection has been run in this browser session. This action reads the configured public website only; it cannot edit code, data, DNS or deployments.</p>}
  {state&&!state.ok&&<p><b>Audit unavailable:</b> {state.error}</p>}
  {state?.ok&&<><p><b>{state.brand.name}</b> · {state.audit.url} · {state.audit.latencyMs} ms</p><div className="todayList">{state.audit.findings.map((f:any)=><div key={f.check}><time>{f.status}</time><strong>{f.check}</strong><small>{f.detail}</small></div>)}</div></>}
 </div>
}

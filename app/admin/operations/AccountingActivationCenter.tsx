"use client";
import {useState} from "react";import {useRouter} from "next/navigation";
const money=(n:any)=>"$"+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
export default function AccountingActivationCenter({profiles}:{profiles:any[]}){
 const router=useRouter(),[error,setError]=useState("");
 async function send(body:any){setError("");const r=await fetch("/api/admin/accounting-routing",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!j.ok){setError(j.error||"Unable to save");return;}router.refresh();}
 return <section className="adminPanel" style={{padding:18}}>
  <div className="attentionIntro"><p className="eyebrow">MULTI-ENTITY ACCOUNTING ROUTER</p><h2>Revenue activates the books</h2><p>Each entity stays dormant until its first successful contract payment. Then WGOS earmarks the accounting reserve and marks that company ready for its own accounting file.</p></div>
  {error&&<p>{error}</p>}
  <div style={{display:"grid",gap:10,marginTop:14}}>{profiles.map((p:any)=><article key={p.brand_id} style={{padding:14,border:"1px solid rgba(255,255,255,.08)",borderRadius:14}}>
   <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) repeat(4,minmax(110px,auto))",gap:10,alignItems:"center"}}>
    <div><strong>{p.brand_name}</strong><small style={{display:"block"}}>{p.provider} · target {p.plan_target}</small></div>
    <div><small>STATUS</small><strong style={{display:"block"}}>{String(p.activation_status).replaceAll("_"," ")}</strong></div>
    <div><small>FIRST DEPOSIT</small><strong style={{display:"block"}}>{p.first_deposit_amount!=null?money(p.first_deposit_amount):"—"}</strong></div>
    <div><small>RESERVE</small><strong style={{display:"block"}}>{p.reserve_amount!=null?money(p.reserve_amount):(p.reserve_mode==="FIXED"?money(p.reserve_value):p.reserve_value+"%")}</strong></div>
    <div><small>QUEUED</small><strong style={{display:"block"}}>{p.queued_items||0}</strong></div>
   </div>
   <form onSubmit={async e=>{e.preventDefault();const b:any=Object.fromEntries(new FormData(e.currentTarget).entries());b.action="profile";b.brandId=p.brand_id;await send(b);}} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:10}}>
    <select name="provider" defaultValue={p.provider||"QUICKBOOKS"}><option>QUICKBOOKS</option><option>XERO</option><option>WAVE</option><option>OTHER</option></select>
    <select name="planTarget" defaultValue={p.plan_target||"LITE"}><option>LITE</option><option>SIMPLE_START</option><option>ESSENTIALS</option><option>PLUS</option><option>ADVANCED</option><option>REVIEW</option></select>
    <select name="activationPolicy" defaultValue={p.activation_policy||"FIRST_DEPOSIT"}><option>FIRST_DEPOSIT</option><option>MANUAL</option><option>IMMEDIATE</option></select>
    <select name="reserveMode" defaultValue={p.reserve_mode||"FIXED"}><option>FIXED</option><option>PERCENT</option></select>
    <input name="reserveValue" defaultValue={p.reserve_value??20} inputMode="decimal" aria-label="Accounting reserve"/>
    <input name="notes" defaultValue={p.notes||""} placeholder="Entity accounting notes"/>
    <button type="submit">Save policy</button>
   </form>
   {p.activation_status==="READY_TO_ACTIVATE"&&<div style={{marginTop:10,padding:10,border:"1px solid rgba(255,255,255,.06)",borderRadius:10}}><strong>Ready to activate.</strong><p className="muted" style={{margin:"4px 0 0"}}>The first deposit has funded this entity's accounting reserve. Purchase/connect the accounting subscription, then record its company ID here.</p>
    <form onSubmit={async e=>{e.preventDefault();const b:any=Object.fromEntries(new FormData(e.currentTarget).entries());b.action="connected";b.brandId=p.brand_id;b.provider=p.provider;await send(b);}} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,marginTop:8}}><input name="providerCompanyId" required placeholder="Provider company ID"/><input name="providerCompanyName" placeholder="Accounting company name"/><button className="newAction" type="submit">Mark connected</button></form>
   </div>}
   {p.activation_status==="CONNECTED"&&<div style={{marginTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span>Connected: <strong>{p.provider_company_name||p.provider_company_id}</strong></span><button onClick={()=>send({action:"sync",brandId:p.brand_id,enabled:!p.sync_enabled})}>{p.sync_enabled?"Pause sync":"Enable sync"}</button></div>}
  </article>)}</div>
 </section>;
}
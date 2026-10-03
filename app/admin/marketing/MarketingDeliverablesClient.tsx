"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

const TYPES=["PHOTO","VIDEO","FLYER","SHOW_INFO","COPY","TESTIMONIAL","AUDIO","PRESS","CALENDAR_ITEM","OFFER","OTHER"];
const STATUSES=["NEEDED","REQUESTED","RECEIVED","IN_PRODUCTION","READY","PUBLISHED","BLOCKED","CANCELLED"];
export default function MarketingDeliverablesClient({rows,brands}:{rows:any[];brands:any[]}){
 const router=useRouter(); const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
 async function create(e:any){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());const r=await fetch("/api/admin/marketing-deliverables",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();setBusy(false);if(!j.ok){setError(j.error||"Unable to save");return;}setOpen(false);router.refresh();}
 async function setStatus(id:string,status:string){await fetch("/api/admin/marketing-deliverables",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id,status})});router.refresh();}
 return <div style={{display:"grid",gap:18}}>
  <div className="adminPanel" style={{padding:18}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}><div><p className="eyebrow">CONTENT INPUT QUEUE</p><h2>Marketing Deliverables</h2><p className="muted">Everything WGOS still needs from owners, artists, partners or staff to create and publish marketing.</p></div><button className="newAction" onClick={()=>setOpen(!open)}>＋ Add deliverable</button></div>
   {open&&<form onSubmit={create} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginTop:18}}>
    <select name="brandId" required defaultValue=""><option value="" disabled>Brand</option>{brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
    <input name="title" required placeholder="What do we need?"/>
    <select name="deliverableType" defaultValue="PHOTO">{TYPES.map(x=><option key={x}>{x}</option>)}</select>
    <select name="priority" defaultValue="MEDIUM"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select>
    <input name="neededFrom" placeholder="Needed from"/>
    <input name="channel" placeholder="Newsletter / SMS / IG / Website"/>
    <input name="campaign" placeholder="Campaign / edition"/>
    <input name="dueAt" type="datetime-local"/>
    <input name="assetUrl" placeholder="Drive / asset link"/>
    <textarea name="notes" placeholder="Notes, shot requirements, copy facts, dimensions..." style={{gridColumn:"1/-1"}}/>
    {error&&<p style={{gridColumn:"1/-1"}}>{error}</p>}<button disabled={busy} className="newAction" type="submit">{busy?"Saving…":"Save deliverable"}</button>
   </form>}
  </div>
  <div className="adminPanel" style={{padding:0,overflow:"hidden"}}>
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}><thead><tr><th>Brand</th><th>Deliverable</th><th>Type</th><th>Needed from</th><th>Use</th><th>Due</th><th>Priority</th><th>Status</th></tr></thead><tbody>
   {rows.length===0&&<tr><td colSpan={8} style={{padding:24}}>No marketing inputs are currently outstanding.</td></tr>}
   {rows.map((r:any)=><tr key={r.id}><td>{r.brand_name}</td><td><strong>{r.title}</strong>{r.notes&&<div className="muted">{r.notes}</div>}{r.asset_url&&<div><a href={r.asset_url} target="_blank">Asset ↗</a></div>}</td><td>{r.deliverable_type}</td><td>{r.needed_from||"—"}</td><td>{[r.channel,r.campaign].filter(Boolean).join(" · ")||"—"}</td><td>{r.due_at?new Date(r.due_at).toLocaleDateString():"—"}</td><td>{r.priority}</td><td><select value={r.status} onChange={e=>setStatus(r.id,e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></td></tr>)}
   </tbody></table></div>
  </div>
 </div>;
}

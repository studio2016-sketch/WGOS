"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
export default function GrowthCampaignsClient({campaigns,links,brands}:{campaigns:any[];links:any[];brands:any[]}){
 const router=useRouter();const [mode,setMode]=useState<"campaign"|"link"|null>(null);const [error,setError]=useState("");
 async function save(e:any){e.preventDefault();setError("");const o:any=Object.fromEntries(new FormData(e.currentTarget).entries());o.kind=mode;const r=await fetch("/api/admin/growth-campaigns",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(o)});const j=await r.json();if(!j.ok){setError(j.error||"Unable to save");return;}setMode(null);router.refresh();}
 return <section className="adminPanel" style={{padding:18}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><p className="eyebrow">ATTRIBUTION ENGINE</p><h2>Campaigns + Trackable Links</h2><p className="muted">Give every post, bio link, video CTA and newsletter a measurable path into the WGOS revenue loop.</p></div><div style={{display:"flex",gap:8}}><button className="newAction" onClick={()=>setMode("campaign")}>＋ Campaign</button><button className="newAction" onClick={()=>setMode("link")}>＋ Trackable link</button></div></div>
  {mode&&<form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginTop:16}}>
   <select name="brandId" required defaultValue=""><option value="" disabled>Brand</option>{brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
   {mode==="campaign"?<><input name="name" required placeholder="Campaign name"/><input name="objective" placeholder="Objective"/><label>Starts<input name="startsOn" type="date"/></label><label>Ends<input name="endsOn" type="date"/></label></>:<>
    <select name="campaignId" required defaultValue=""><option value="" disabled>Campaign</option>{campaigns.map((c:any)=><option key={c.id} value={c.id}>{c.brand_name} · {c.name}</option>)}</select><input name="label" required placeholder="Link label"/><input name="destinationUrl" required placeholder="https://..."/><input name="source" required placeholder="instagram"/><input name="medium" defaultValue="social" placeholder="social"/><input name="utmCampaign" placeholder="utm campaign"/><input name="content" placeholder="reel-name / bio / caption"/></>}
   {error&&<p>{error}</p>}<button className="newAction" type="submit">Save</button>
  </form>}
  <div style={{display:"grid",gap:12,marginTop:18}}>{campaigns.map((c:any)=>{const cl=links.filter((l:any)=>l.campaign_id===c.id);return <article key={c.id} style={{padding:14,border:"1px solid rgba(255,255,255,.08)",borderRadius:14}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><small>{c.brand_name} · {c.status}</small><h3 style={{margin:"4px 0"}}>{c.name}</h3><span className="muted">{c.objective||"No objective set"}</span></div><div style={{display:"flex",gap:16,flexWrap:"wrap"}}><span><b>{c.event_count}</b><small> events</small></span><span><b>{c.signup_count}</b><small> signups</small></span><span><b>{c.inquiry_count}</b><small> inquiries</small></span><span><b>{c.sale_count}</b><small> sales</small></span><span><b>{"$"+(Number(c.revenue_cents||0)/100).toLocaleString()}</b><small> revenue</small></span></div></div>
   {cl.length>0&&<div style={{display:"grid",gap:8,marginTop:12}}>{cl.map((l:any)=><div key={l.id} style={{display:"grid",gridTemplateColumns:"minmax(130px,.6fr) 1fr",gap:12}}><strong>{l.label}</strong><a href={l.tagged_url} target="_blank" rel="noreferrer" style={{overflowWrap:"anywhere"}}>{l.tagged_url}</a></div>)}</div>}
  </article>})}{campaigns.length===0&&<p className="muted">Create the first campaign to begin attribution.</p>}</div>
 </section>;
}

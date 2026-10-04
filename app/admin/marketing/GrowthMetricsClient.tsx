"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
const PLATFORMS=["INSTAGRAM","FACEBOOK","TIKTOK","YOUTUBE","WEBSITE","EMAIL_SMS","OTHER"];
export default function GrowthMetricsClient({rows,brands}:{rows:any[];brands:any[]}){
 const router=useRouter(),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function save(e:any){e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);const o:any=Object.fromEntries(f.entries());o.revenueCents=Math.round((Number(o.revenueDollars)||0)*100);delete o.revenueDollars;const r=await fetch("/api/admin/growth-metrics",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(o)});const j=await r.json();setBusy(false);if(!j.ok){setError(j.error||"Unable to save");return;}setOpen(false);router.refresh();}
 return <section className="adminPanel growthMetricsWorkspace" style={{padding:18}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><p className="eyebrow">CLOSED-LOOP ANALYTICS</p><h2>Social → YouTube → Website → List → Sales</h2><p className="muted">Measure the whole growth loop, not vanity metrics in isolation.</p></div><button className="newAction" onClick={()=>setOpen(!open)}>＋ Add metrics</button></div>
  {open&&<form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10,marginTop:16}}>
   <select name="brandId" required defaultValue=""><option value="" disabled>Brand</option>{brands.map((b:any)=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
   <input name="title" placeholder="Campaign / post / video"/><select name="platform" defaultValue="INSTAGRAM">{PLATFORMS.map(x=><option key={x}>{x}</option>)}</select><input name="accountLabel" placeholder="@account"/>
   <label>Start<input name="periodStart" type="date" required/></label><label>End<input name="periodEnd" type="date" required/></label>
   <input name="followers" type="number" min="0" placeholder="Followers"/><input name="impressions" type="number" min="0" placeholder="Impressions"/><input name="reach" type="number" min="0" placeholder="Reach"/>
   <input name="contentViews" type="number" min="0" placeholder="Video/content views"/><input name="engagements" type="number" min="0" placeholder="Engagements"/><input name="outboundClicks" type="number" min="0" placeholder="Outbound clicks"/>
   <input name="youtubeWatchMinutes" type="number" min="0" placeholder="YouTube watch min"/><input name="websiteSessions" type="number" min="0" placeholder="Website sessions"/><input name="listSignups" type="number" min="0" placeholder="List signups"/>
   <input name="inquiries" type="number" min="0" placeholder="Inquiries"/><input name="salesCount" type="number" min="0" placeholder="Sales"/><input name="revenueDollars" type="number" min="0" step="0.01" placeholder="Revenue $"/>
   <textarea name="notes" placeholder="CTA, audience, observations..." style={{gridColumn:"1/-1"}}/>{error&&<p>{error}</p>}<button className="newAction" disabled={busy} type="submit">{busy?"Saving…":"Save snapshot"}</button>
  </form>}
  <div style={{overflowX:"auto",marginTop:18}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:1150}}><thead><tr><th>Period</th><th>Brand</th><th>Platform</th><th>Views</th><th>Engagement</th><th>Clicks</th><th>YT Watch</th><th>Web</th><th>List</th><th>Inquiries</th><th>Sales</th><th>Revenue</th></tr></thead><tbody>
   {rows.slice(0,60).map((r:any)=><tr key={r.id}><td>{String(r.period_end)}</td><td>{r.brand_name}</td><td>{r.platform}</td><td>{Number(r.content_views||0).toLocaleString()}</td><td>{Number(r.engagements||0).toLocaleString()}</td><td>{Number(r.outbound_clicks||0).toLocaleString()}</td><td>{Number(r.youtube_watch_minutes||0).toLocaleString()}m</td><td>{Number(r.website_sessions||0).toLocaleString()}</td><td>{Number(r.list_signups||0).toLocaleString()}</td><td>{Number(r.inquiries||0).toLocaleString()}</td><td>{Number(r.sales_count||0).toLocaleString()}</td><td>{"$"+(Number(r.revenue_cents||0)/100).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}</td></tr>)}
   {rows.length===0&&<tr><td colSpan={12} style={{padding:20}}>No growth snapshots yet.</td></tr>}
  </tbody></table></div>
 </section>;
}
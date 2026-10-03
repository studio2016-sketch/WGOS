export default function GrowthSources({sources}:{sources:any[]}){
 return <section className="adminPanel" style={{padding:18}}>
  <div><p className="eyebrow">DATA SOURCE HEALTH</p><h2>Connected Growth Sources</h2><p className="muted">WGOS separates missing coverage from true zero performance, so new connections never distort decision-making.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginTop:16}}>
   {sources.map((s:any)=><article key={s.id} style={{padding:14,border:"1px solid rgba(255,255,255,.08)",borderRadius:14}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10}}><strong>{s.brand_name}</strong><span>{s.status}</span></div>
    <h3 style={{margin:"8px 0"}}>{s.provider}</h3>
    <p className="muted">{s.account_label||"Connected account"}</p>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",margin:"10px 0"}}>{(Array.isArray(s.networks)?s.networks:[]).map((n:string)=><small key={n} style={{padding:"4px 8px",border:"1px solid rgba(255,255,255,.08)",borderRadius:20}}>{n}</small>)}</div>
    <small>Coverage: {s.coverage_start_at?new Date(s.coverage_start_at).toLocaleDateString():"unknown"} · Mode: {s.sync_mode}</small>
    {s.notes&&<p className="muted" style={{marginTop:8}}>{s.notes}</p>}
   </article>)}
   {sources.length===0&&<p className="muted">No external growth sources registered yet.</p>}
  </div>
 </section>;
}

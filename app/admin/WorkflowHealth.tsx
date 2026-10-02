"use client";
import {useState} from "react";
export default function WorkflowHealth({data}:{data:any}){
 const [rows,setRows]=useState<any[]>(data?.dead||[]),[busy,setBusy]=useState("");
 const s=data?.summary||{};
 async function retry(id:string){setBusy(id);try{const r=await fetch("/api/admin/workflows/dead-letter/"+encodeURIComponent(id)+"/retry",{method:"POST"});if(r.ok)setRows(x=>x.filter(y=>y.id!==id));}finally{setBusy("")}}
 return <section className="adminPanel"><div className="integrationHead"><div><p className="eyebrow">WORKFLOW HEALTH</p><h2>Retry & Recovery</h2><p className="muted">Routine events retry automatically. Exhausted failures are isolated for deliberate recovery.</p></div><div className="providerLegend"><span>{Number(s.pending||0)} pending · {Number(s.failed||0)} failed</span><small>{Number(s.processed||0)} processed</small></div></div>
 {!rows.length?<p className="muted">No unresolved dead-letter events.</p>:<div className="todayList">{rows.map(x=><div key={x.id}><time>FAILED</time><strong>{x.topic} · {x.brand_name}</strong><small>{x.error||x.last_error||"Workflow failed after automatic retries"} · {x.attempt_count} attempts</small><button className="journeyLinkButton" disabled={busy===x.id} onClick={()=>retry(x.id)}>{busy===x.id?"Requeueing…":"Retry →"}</button></div>)}</div>}
 </section>
}
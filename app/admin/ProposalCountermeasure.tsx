"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

export default function ProposalCountermeasure({proposals,reviews}:{proposals:any[];reviews:any[]}){
 const router=useRouter();
 const map=useMemo(()=>new Map(reviews.map((r:any)=>[r.proposal_id,r])),[reviews]);
 const drafts=proposals.filter((p:any)=>p.status==="DRAFT");
 const [selected,setSelected]=useState(drafts[0]?.id||"");
 const p=drafts.find((x:any)=>x.id===selected);
 const r:any=map.get(selected);
 if(!drafts.length)return <section className="adminPanel compactCountermeasure"><div><p className="eyebrow">PROPOSAL COUNTERMEASURE</p><h2>No draft proposal needs review</h2><p className="muted">Approved or released proposals have already cleared the owner gate.</p></div></section>;
 return <section className="adminPanel compactCountermeasure">
  <div className="compactCounterHead"><div><p className="eyebrow">PROPOSAL COUNTERMEASURE</p><h2>Owner review gate</h2><p className="muted">One place to review the proposal, client-facing language, pricing, assumptions and risk before release.</p></div><span className={"status "+(r?.status==="READY"?"ready":"")}>{r?.status||"INCOMPLETE"} · {Number(r?.readiness_score||0)}%</span></div>
  <select value={selected} onChange={e=>setSelected(e.target.value)}>{drafts.map((x:any)=><option key={x.id} value={x.id}>{x.brand_name} · {x.opportunity_title||"Proposal"} · v{x.version}</option>)}</select>
  {p&&<div className="compactCounterBody">
   <div><small>PROPOSAL</small><strong>{p.opportunity_title}</strong><span>{p.brand_name} · Draft v{p.version}</span></div>
   <div><small>INVESTMENT</small><strong>{"$"+Number(p.one_time_total||0).toLocaleString()}</strong><span>{Number(p.deposit_amount||0).toLocaleString()} deposit</span></div>
   <div><small>WHAT STILL NEEDS JUDGMENT</small><strong>{r?.missing_information?"Owner decision required":"Core risk review complete"}</strong><span>{r?.missing_information||"Review wording, price and client preview before approval."}</span></div>
   <button className="primary" onClick={()=>router.push("/admin/proposals/"+p.id)}>Review Full Proposal →</button>
  </div>}
 </section>;
}

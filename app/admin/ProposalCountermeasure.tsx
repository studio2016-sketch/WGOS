"use client";
import {useMemo,useState} from "react";import {useRouter} from "next/navigation";
export default function ProposalCountermeasure({proposals,reviews}:{proposals:any[];reviews:any[]}){
 const router=useRouter(),map=useMemo(()=>new Map(reviews.map((r:any)=>[r.proposal_id,r])),[reviews]),drafts=proposals.filter((p:any)=>p.status==="DRAFT"),[selected,setSelected]=useState(drafts[0]?.id||""),[error,setError]=useState("");const p=drafts.find((x:any)=>x.id===selected),r:any=map.get(selected);
 async function save(e:any){e.preventDefault();setError("");const body:any=Object.fromEntries(new FormData(e.currentTarget).entries());body.proposalId=selected;const res=await fetch("/api/admin/proposal-countermeasure",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await res.json();if(!j.ok){setError(j.error||"Unable to save");return;}router.refresh();}
 async function override(){const reason=window.prompt("Why is it responsible to present this proposal before every countermeasure item is complete?");if(!reason)return;const res=await fetch("/api/admin/proposal-countermeasure",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({proposalId:selected,action:"override",reason})});const j=await res.json();if(!j.ok){setError(j.error||"Unable to override");return;}router.refresh();}
 return <section className="adminPanel" style={{padding:18}}>
  <div className="attentionIntro"><p className="eyebrow">PROPOSAL COUNTERMEASURE</p><h2>Red-team before presentation</h2><p>Challenge every recommendation from the buyer, finance, technical, procurement, competitive and implementation perspectives before it can be approved for the client.</p></div>
  {drafts.length===0?<p className="muted">No draft proposals require countermeasure review.</p>:<>
   <select value={selected} onChange={e=>setSelected(e.target.value)} style={{margin:"12px 0"}}>{drafts.map((x:any)=><option key={x.id} value={x.id}>{x.brand_name} · {x.opportunity_title||"Proposal"} · v{x.version}</option>)}</select>
   {p&&<><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",padding:12,border:"1px solid rgba(255,255,255,.08)",borderRadius:12,marginBottom:12}}><div><strong>{p.opportunity_title}</strong><span className="muted" style={{display:"block"}}>{"$"+Number(p.one_time_total||0).toLocaleString()} · Draft v{p.version}</span></div><div><small>GATE STATUS</small><strong style={{display:"block"}}>{r?.status||"INCOMPLETE"} · {Number(r?.readiness_score||0)}%</strong></div></div>
   <form onSubmit={save} style={{display:"grid",gap:10}}>
    <textarea name="buyerCase" defaultValue={r?.buyer_case||""} placeholder="BUYER: Why would the economic buyer say no? What outcome must justify this investment?"/>
    <textarea name="financeCase" defaultValue={r?.finance_case||""} placeholder="FINANCE/CFO: Why this price? What is the ROI, avoided cost, risk reduction or total-value argument?"/>
    <textarea name="technicalCase" defaultValue={r?.technical_case||""} placeholder="TECHNICAL: What could fail? Support, compatibility, redundancy, staffing, training, reliability?"/>
    <textarea name="procurementCase" defaultValue={r?.procurement_case||""} placeholder="PROCUREMENT/LEGAL: Vendor setup, insurance, contract, PO, payment, cancellation, warranty or compliance issues?"/>
    <textarea name="competitiveCase" defaultValue={r?.competitive_case||""} placeholder="COMPETITIVE: Why not the cheaper option, incumbent, DIY path, competitor or alternate solution?"/>
    <textarea name="implementationCase" defaultValue={r?.implementation_case||""} placeholder="IMPLEMENTATION: Schedule, dependencies, client responsibilities, logistics and adoption risks?"/>
    <textarea name="inactionCase" defaultValue={r?.inaction_case||""} placeholder="DO NOTHING: What happens if the client delays or makes no change? Is urgency legitimate?"/>
    <textarea name="scopeRisks" defaultValue={r?.scope_risks||""} placeholder="SCOPE RISKS: What ambiguity, assumption or exclusion could cause conflict later?"/>
    <textarea name="pricingRisks" defaultValue={r?.pricing_risks||""} placeholder="PRICING RISKS: Are we underpricing, over-discounting, omitting options or failing to defend value?"/>
    <textarea name="legalRisks" defaultValue={r?.legal_risks||""} placeholder="LEGAL/COMMERCIAL RISKS: Any unusual liability, IP, cancellation, payment or contractual issue to flag for counsel?"/>
    <textarea name="assumptions" defaultValue={r?.assumptions||""} placeholder="ASSUMPTIONS: What are we assuming to be true?"/>
    <textarea name="missingInformation" defaultValue={r?.missing_information||""} placeholder="MISSING INFORMATION: What do we still not know?"/>
    <textarea name="mitigationPlan" defaultValue={r?.mitigation_plan||""} placeholder="MITIGATION: How have we reduced or addressed the major risks?"/>
    <textarea name="recommendation" defaultValue={r?.recommendation||""} placeholder="FINAL RECOMMENDATION: Present as-is, revise, narrow, expand, reprice, gather more information or do not pursue?"/>
    {error&&<p>{error}</p>}<div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="newAction" type="submit">Save countermeasure review</button>{r&&r.status==="INCOMPLETE"&&<button type="button" onClick={override}>Executive override</button>}</div>
   </form></>}</>}
 </section>;
}

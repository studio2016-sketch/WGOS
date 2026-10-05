"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

function textValue(v:any){
 if(v==null)return "";
 if(typeof v==="string")return v;
 try{return JSON.stringify(v,null,2)}catch{return String(v)}
}
const riskLabels:any={
 buyer_case:"Buyer",
 finance_case:"Finance",
 technical_case:"Technical",
 procurement_case:"Procurement / Legal",
 competitive_case:"Competitive",
 implementation_case:"Implementation",
 inaction_case:"Cost of Inaction",
 scope_risks:"Scope Risk",
 pricing_risks:"Pricing Risk",
 legal_risks:"Legal / Commercial",
 assumptions:"Assumptions",
 missing_information:"Still Missing",
 mitigation_plan:"Mitigation",
 recommendation:"Recommendation"
};

export default function ProposalReviewWorkspace({data}:{data:any}){
 const router=useRouter();
 const p=data.proposal;
 const [tab,setTab]=useState<"review"|"preview"|"risk">("review");
 const [sections,setSections]=useState<any[]>((data.sections||[]).map((s:any)=>({...s,title:String(s.title||""),content:textValue(s.content)})));
 const [total,setTotal]=useState(String(p.one_time_total||0));
 const [deposit,setDeposit]=useState(String(p.deposit_amount||0));
 const [busy,setBusy]=useState("");
 const [message,setMessage]=useState("");
 const counter=data.countermeasure||{};
 const readiness=Number(counter.readiness_score||0);
 const clientName=[p.first_name,p.last_name].filter(Boolean).join(" ")||p.organization_name||"Client";
 const sectionCount=sections.length;
 const riskItems=useMemo(()=>Object.entries(riskLabels).map(([key,label])=>({key,label,value:String(counter[key]||"").trim()})).filter(x=>x.value),[counter]);

 async function save(){
  setBusy("save");setMessage("");
  try{
   const r=await fetch("/api/admin/proposals/"+p.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({
    action:"save-review",oneTimeTotal:Number(total||0),depositAmount:Number(deposit||0),
    sections:sections.map((s:any)=>({id:s.id,title:s.title,content:s.content}))
   })});
   const j=await r.json();if(!r.ok)throw new Error(j.error||"Unable to save proposal");
   setMessage("Proposal changes saved. Nothing has been released to the client.");
   router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to save proposal")}finally{setBusy("")}
 }
 async function approve(){
  if(!window.confirm("Approve this proposal for client release? This does not send it. It only clears the owner approval gate."))return;
  setBusy("approve");setMessage("");
  try{
   const r=await fetch("/api/admin/proposals/"+p.id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({action:"approve"})});
   const j=await r.json();if(!r.ok)throw new Error(j.error||"Unable to approve proposal");
   setMessage("Approved for client release. The proposal has NOT been sent. Return to Commercial Lifecycle when you are ready to create the client link.");
   router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Unable to approve proposal")}finally{setBusy("")}
 }

 return <main className="admin proposalReviewPage">
  <div className="proposalReviewTop">
   <button onClick={()=>router.push("/admin#commercial-lifecycle")}>← Back to Command</button>
   <div>
    <p className="eyebrow">{p.brand_name} · OWNER REVIEW</p>
    <h1>{p.opportunity_title||"Proposal"}</h1>
    <p>{clientName} · v{p.version}</p>
   </div>
   <span className={"status "+String(p.status||"").toLowerCase()}>{p.status}</span>
  </div>

  <section className="proposalReviewSummary">
   <article><small>CLIENT</small><strong>{clientName}</strong><span>{p.contact_email||p.organization_name||"Direct relationship"}</span></article>
   <article><small>INVESTMENT</small><strong>{"$"+Number(total||0).toLocaleString()}</strong><span>{"$"+Number(deposit||0).toLocaleString()+" deposit"}</span></article>
   <article><small>PROPOSAL</small><strong>{sectionCount} sections</strong><span>Draft v{p.version}</span></article>
   <article><small>RISK GATE</small><strong>{readiness}%</strong><span>{String(counter.status||"INCOMPLETE").replaceAll("_"," ")}</span></article>
  </section>

  <section className="proposalReviewGuide">
   <div><b>1</b><span><strong>Review</strong><small>Scope, language, price</small></span></div>
   <i>→</i><div><b>2</b><span><strong>Approve</strong><small>Owner clears release gate</small></span></div>
   <i>→</i><div><b>3</b><span><strong>Release</strong><small>Client link created separately</small></span></div>
  </section>

  <nav className="proposalReviewTabs">
   <button className={tab==="review"?"active":""} onClick={()=>setTab("review")}>Proposal</button>
   <button className={tab==="preview"?"active":""} onClick={()=>setTab("preview")}>Client Preview</button>
   <button className={tab==="risk"?"active":""} onClick={()=>setTab("risk")}>Risk & Assumptions <span>{readiness}%</span></button>
  </nav>

  {message&&<p className="lifecycleMessage">{message}</p>}

  {tab==="review"&&<section className="proposalEditorGrid">
   <div className="proposalEditorMain">
    {sections.map((s:any,index:number)=><article className="proposalEditSection" key={s.id}>
     <div className="proposalSectionIndex">{String(index+1).padStart(2,"0")}</div>
     <div>
      <label>SECTION TITLE<input value={s.title} onChange={e=>setSections(xs=>xs.map((x:any)=>x.id===s.id?{...x,title:e.target.value}:x))}/></label>
      <label>CLIENT-FACING CONTENT<textarea rows={Math.max(5,Math.min(12,s.content.split("\n").length+3))} value={s.content} onChange={e=>setSections(xs=>xs.map((x:any)=>x.id===s.id?{...x,content:e.target.value}:x))}/></label>
     </div>
    </article>)}
   </div>
   <aside className="proposalDecisionPanel">
    <p className="eyebrow">COMMERCIAL TERMS</p>
    <label>Total investment<input inputMode="decimal" value={total} onChange={e=>setTotal(e.target.value)}/></label>
    <label>Deposit<input inputMode="decimal" value={deposit} onChange={e=>setDeposit(e.target.value)}/></label>
    <div className="proposalCheck">
     <span className={readiness===100?"ok":"warn"}>{readiness===100?"✓":"!"}</span>
     <div><strong>Countermeasure {readiness===100?"ready":"needs attention"}</strong><small>{counter.missing_information||"Review scope, pricing and assumptions before release."}</small></div>
    </div>
    <button onClick={()=>setTab("preview")}>Preview as Client →</button>
   </aside>
  </section>}

  {tab==="preview"&&<section className="proposalClientPreview">
   <div className="proposalPreviewHero"><p>{p.brand_name}</p><span>PRIVATE PROPOSAL · v{p.version}</span><h2>{p.opportunity_title}</h2><small>Prepared for {clientName}</small></div>
   <div className="proposalPreviewBody">
    {sections.map((s:any)=><article key={s.id}><small>{s.section_type?.replaceAll("_"," ")}</small><h3>{s.title}</h3><p>{s.content}</p></article>)}
    <article className="proposalPreviewInvestment"><small>INVESTMENT</small><h3>{"$"+Number(total||0).toLocaleString()}</h3><p>{"Deposit: $"+Number(deposit||0).toLocaleString()}</p></article>
   </div>
  </section>}

  {tab==="risk"&&<section className="proposalRiskGrid">
   <header><div><p className="eyebrow">PROPOSAL COUNTERMEASURE</p><h2>What could make this proposal fail?</h2><p>Internal only. These notes never appear in the client proposal.</p></div><strong>{readiness}%</strong></header>
   <div>{riskItems.map((x:any)=><article key={x.key}><small>{x.label}</small><p>{x.value}</p></article>)}</div>
  </section>}

  <div className="proposalReviewDock">
   <div><small>OWNER GATE</small><strong>{p.status==="DRAFT"?"Review before client release":"Approved for release"}</strong><span>Approval never sends automatically.</span></div>
   {p.status==="DRAFT"?<><button disabled={Boolean(busy)} onClick={save}>{busy==="save"?"Saving…":"Save Changes"}</button><button className="primary" disabled={Boolean(busy)||readiness<100} onClick={approve}>{busy==="approve"?"Approving…":"Approve for Client Release →"}</button></>:<button className="primary" onClick={()=>router.push("/admin#commercial-lifecycle")}>Return to Next Step →</button>}
  </div>
 </main>
}

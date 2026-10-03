"use client";
import {useState} from "react";import {useRouter} from "next/navigation";
export default function SalesLearningLab({opportunities,learning}:{opportunities:any[];learning:any}){
 const router=useRouter(),[mode,setMode]=useState<"event"|"review">("event"),[error,setError]=useState("");
 async function submit(e:any){e.preventDefault();setError("");const d:any=Object.fromEntries(new FormData(e.currentTarget).entries());d.kind=mode;const r=await fetch("/api/admin/sales-learning",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(d)});const j=await r.json();if(!j.ok){setError(j.error||"Unable to save");return;}e.currentTarget.reset();router.refresh();}
 return <section className="adminPanel" style={{padding:18}}>
  <div className="attentionIntro"><p className="eyebrow">SALES LEARNING LAB</p><h2>Turn every deal into better future decisions</h2><p>Capture what advanced the buyer, what stalled, what objection appeared, what insight landed and why we ultimately won or lost.</p></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:12,margin:"16px 0"}}>
   <article style={{padding:14,border:"1px solid rgba(255,255,255,.08)",borderRadius:14}}><small>RECORDED LEARNING</small><strong style={{display:"block",fontSize:"1.8rem"}}>{learning.events.length}</strong><span className="muted">deal interactions captured</span></article>
   <article style={{padding:14,border:"1px solid rgba(255,255,255,.08)",borderRadius:14}}><small>DEAL REVIEWS</small><strong style={{display:"block",fontSize:"1.8rem"}}>{learning.reviews.length}</strong><span className="muted">wins/losses reviewed</span></article>
   <article style={{padding:14,border:"1px solid rgba(255,255,255,.08)",borderRadius:14}}><small>REUSABLE PATTERNS</small><strong style={{display:"block",fontSize:"1.8rem"}}>{learning.patterns.length}</strong><span className="muted">emerging playbook signals</span></article>
  </div>
  {learning.patterns.length>0&&<div style={{display:"grid",gap:8,marginBottom:16}}>{learning.patterns.slice(0,6).map((p:any,i:number)=><div key={i} style={{padding:10,border:"1px solid rgba(255,255,255,.06)",borderRadius:10}}><small>{p.methodology_area||p.event_type}</small><strong style={{display:"block"}}>{p.label}</strong><span className="muted">{p.positive}/{p.uses} positive outcomes</span></div>)}</div>}
  <div style={{display:"flex",gap:8,marginBottom:12}}><button onClick={()=>setMode("event")} className={mode==="event"?"newAction":""}>Capture learning</button><button onClick={()=>setMode("review")} className={mode==="review"?"newAction":""}>Win / loss review</button></div>
  <form onSubmit={submit} style={{display:"grid",gap:10}}>
   <select name="opportunityId" required defaultValue=""><option value="" disabled>Select opportunity</option>{opportunities.map((o:any)=><option key={o.id} value={o.id}>{o.brand_name} · {o.title} · {o.stage}</option>)}</select>
   {mode==="event"?<>
    <select name="eventType" defaultValue="NEXT_ACTION"><option>DISCOVERY</option><option>OBJECTION</option><option>INSIGHT</option><option>NEXT_ACTION</option><option>STAGE_CHANGE</option><option>PROPOSAL</option><option>NEGOTIATION</option><option>WIN</option><option>LOSS</option><option>REFERRAL</option><option>FOLLOW_UP</option><option>OTHER</option></select>
    <input name="methodologyArea" placeholder="Framework area: MEDDPICC / Challenger / Sandler / Girard"/>
    <input name="eventLabel" placeholder="Short label: CFO joined call / price objection / risk reframe"/>
    <textarea name="actionTaken" placeholder="What did we do or say?"/>
    <textarea name="outcome" placeholder="What happened immediately afterward?"/>
    <textarea name="lesson" placeholder="What should WGOS learn and reuse?"/>
    <label>Confidence in lesson <input name="confidence" type="number" min="0" max="100" defaultValue="70"/></label>
   </>:<>
    <select name="outcome" defaultValue="WON"><option>WON</option><option>LOST</option><option>NO_DECISION</option></select>
    <input name="primaryReason" placeholder="Primary reason for outcome"/>
    <textarea name="whatWorked" placeholder="What worked?"/>
    <textarea name="whatFailed" placeholder="What failed or created friction?"/>
    <textarea name="objections" placeholder="Objections and how they were handled"/>
    <textarea name="decisiveMoment" placeholder="What moment or action most affected the outcome?"/>
    <textarea name="competitorNotes" placeholder="Competitor / alternative notes"/>
    <textarea name="pricingNotes" placeholder="Pricing and value perception notes"/>
    <textarea name="relationshipNotes" placeholder="Relationship / champion / stakeholder notes"/>
    <textarea name="reusableLesson" placeholder="What should become a reusable WGOS playbook lesson?"/>
    <select name="wouldPursueAgain" defaultValue=""><option value="">Would pursue again?</option><option value="true">Yes</option><option value="false">No</option></select>
   </>}
   {error&&<p>{error}</p>}<button className="newAction" type="submit">Save learning</button>
  </form>
 </section>;
}

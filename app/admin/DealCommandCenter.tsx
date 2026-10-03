"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
const scoreFields=[["fitScore","FIT"],["intentScore","INTENT"],["authorityScore","AUTHORITY"],["urgencyScore","URGENCY"],["valueScore","VALUE"]] as const;
function score(p:any){return Number(p?.fit_score||0)+Number(p?.intent_score||0)+Number(p?.authority_score||0)+Number(p?.urgency_score||0)+Number(p?.value_score||0)}
function tier(s:number,v:number){return s>=80||v>=50000?"STRATEGIC PURSUIT":s>=65||v>=25000?"PRIORITY OPPORTUNITY":s>=45?"STANDARD OPPORTUNITY":"NURTURE"}
function action(o:any,p:any){const today=new Date().toISOString().slice(0,10),v=Number(o.estimated_value||0);if(!p)return v>=10000?"Build deal map + identify economic buyer":"Complete qualification";if(p.next_commitment_due&&String(p.next_commitment_due).slice(0,10)<today)return"Next commitment overdue — contact client today";if(v>=10000&&!p.economic_buyer)return"Identify and engage the economic buyer";if(v>=10000&&!p.champion)return"Secure an internal champion";if(["QUALIFYING","DISCOVERY"].includes(o.stage)&&!p.decision_criteria)return"Document decision criteria";if(["DISCOVERY","PROPOSAL"].includes(o.stage)&&!p.decision_process)return"Map approval and decision process";if(o.stage==="PROPOSAL"&&!p.next_commitment)return"Secure a dated next commitment";if(o.stage==="NEGOTIATION")return"Resolve final terms and ask for agreement + deposit";return p.next_commitment||"Advance the opportunity";}
export default function DealCommandCenter({opportunities,profiles}:{opportunities:any[];profiles:any[]}){
 const router=useRouter(),profileMap=useMemo(()=>new Map(profiles.map((p:any)=>[p.opportunity_id,p])),[profiles]);
 const open=opportunities.filter((o:any)=>!["WON","LOST"].includes(o.stage));const ranked=open.map((o:any)=>{const p:any=profileMap.get(o.id),s=score(p);return {...o,_p:p,_score:s,_tier:tier(s,Number(o.estimated_value||0)),_action:action(o,p)}}).sort((a:any,b:any)=>(b._score+Math.min(20,Number(b.estimated_value||0)/2500))-(a._score+Math.min(20,Number(a.estimated_value||0)/2500)));
 const [selected,setSelected]=useState<string>(ranked[0]?.id||"");const [error,setError]=useState("");const current:any=ranked.find((x:any)=>x.id===selected),p=current?profileMap.get(current.id):null;
 async function save(e:any){e.preventDefault();setError("");const data:any=Object.fromEntries(new FormData(e.currentTarget).entries());data.opportunityId=selected;const r=await fetch("/api/admin/deal-command",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});const j=await r.json();if(!j.ok){setError(j.error||"Unable to save");return;}router.refresh();}
 return <section className="adminPanel" style={{padding:18}}>
  <div className="attentionIntro"><p className="eyebrow">DEAL COMMAND CENTER</p><h2>High-value closing intelligence</h2><p>Prioritize the right opportunities, map the buying committee, remove decision friction and always know the next commitment required to close.</p></div>
  {ranked.length===0?<p className="muted">No open opportunities.</p>:<><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,margin:"16px 0"}}>
   {ranked.slice(0,8).map((o:any)=><button key={o.id} onClick={()=>setSelected(o.id)} style={{textAlign:"left",padding:14,borderRadius:14,border:selected===o.id?"1px solid currentColor":"1px solid rgba(255,255,255,.08)",background:"transparent",color:"inherit"}}><small>{o.brand_name} · {o.stage}</small><strong style={{display:"block",margin:"5px 0"}}>{o.title}</strong><span style={{display:"block"}}>{"$"+Number(o.estimated_value||0).toLocaleString()} · {o._score}/100</span><small>{o._tier}</small><p style={{margin:"8px 0 0"}}>{o._action}</p></button>)}
  </div>
  {current&&<form onSubmit={save} style={{display:"grid",gap:14}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><small>{current.brand_name} · {current.stage}</small><h3 style={{margin:"4px 0"}}>{current.title}</h3><p className="muted">{current.organization_name||"Direct client"} · {"$"+Number(current.estimated_value||0).toLocaleString()}</p></div><div><small>CLOSE SCORE</small><strong style={{display:"block",fontSize:"2rem"}}>{current._score}/100</strong><span>{current._tier}</span></div></div>
   <div style={{padding:12,border:"1px solid rgba(255,255,255,.1)",borderRadius:12}}><small>NEXT BEST ACTION</small><strong style={{display:"block",marginTop:4}}>{current._action}</strong></div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10}}>
    <input name="economicBuyer" defaultValue={p?.economic_buyer||""} placeholder="Economic buyer"/>
    <input name="champion" defaultValue={p?.champion||""} placeholder="Internal champion"/>
    <input name="influencers" defaultValue={p?.influencers||""} placeholder="Influencers / committee"/>
    <input name="budgetRange" defaultValue={p?.budget_range||""} placeholder="Budget range"/>
    <input name="competitors" defaultValue={p?.competitors||""} placeholder="Competitors / alternatives"/>
    <input name="probability" type="number" min="0" max="100" defaultValue={p?.probability??20} placeholder="Close probability %"/>
    <input name="expansionValue" type="number" min="0" step="100" defaultValue={p?.expansion_value||0} placeholder="Expansion value"/>
    <label>Next commitment due<input name="nextCommitmentDue" type="date" defaultValue={p?.next_commitment_due?String(p.next_commitment_due).slice(0,10):""}/></label>
   </div>
   <textarea name="decisionCriteria" defaultValue={p?.decision_criteria||""} placeholder="Decision criteria — what must be true for us to win?"/>
   <textarea name="decisionProcess" defaultValue={p?.decision_process||""} placeholder="Decision process — who approves what, in what order?"/>
   <textarea name="urgencyNotes" defaultValue={p?.urgency_notes||""} placeholder="Urgency, deadline, event date, consequences of delay"/>
   <textarea name="nextCommitment" defaultValue={p?.next_commitment||""} placeholder="Specific next client commitment"/>
   <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(90px,1fr))",gap:8}}>{scoreFields.map(([name,label])=><label key={name}><small>{label} /20</small><input name={name} type="number" min="0" max="20" defaultValue={(p as any)?.[name.replace(/[A-Z]/g,m=>"_"+m.toLowerCase())]??(name==="fitScore"?10:5)}/></label>)}</div>
   <textarea name="notes" defaultValue={p?.notes||""} placeholder="Deal notes, objections, risks, leverage, value-case ideas"/>
   {error&&<p>{error}</p>}<button className="newAction" type="submit">Save deal intelligence</button>
  </form>}</>}
 </section>;
}

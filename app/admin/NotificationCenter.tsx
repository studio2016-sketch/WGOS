"use client";
import Link from "next/link";
import {useState} from "react";
export default function NotificationCenter({rows:initial}:{rows:any[]}){
 const [rows,setRows]=useState(initial),[busy,setBusy]=useState("");
 async function dismiss(id:string){setBusy(id);try{const r=await fetch("/api/admin/notifications/"+encodeURIComponent(id)+"/read",{method:"POST"});if(r.ok)setRows(x=>x.filter(n=>n.id!==id));}finally{setBusy("");}}
 return <section className="adminPanel"><div className="todayHead"><div><p className="eyebrow">WGOS · NOTIFICATIONS</p><h2>What just changed</h2></div><span className="liveDot">{rows.length||"0"}</span></div>
 {!rows.length?<p className="muted">No pending internal notifications.</p>:<div className="todayList">{rows.map(x=>{const p=x.payload||{};let label="UPDATE",title=String(x.event_type).replaceAll("_"," "),note=p.note||p.reason||"",href="/admin";
  if(x.event_type==="CLIENT_REVISION_REQUESTED"){label="ACTION";title="Client requested a revision · "+x.brand_name;href=p.entity_type==="task"?"/admin/operations?task="+encodeURIComponent(String(p.entity_id||"")):"/admin/operations?project="+encodeURIComponent(String(p.entity_id||""))}
  else if(x.event_type==="CLIENT_APPROVAL"){label="APPROVED";title="Client approval received · "+x.brand_name;href=p.entity_type==="task"?"/admin/operations?task="+encodeURIComponent(String(p.entity_id||"")):"/admin"}
  else if(x.event_type==="AGREEMENT_PREPARED"){label="READY";title="Agreement prepared · "+x.brand_name;note="Accepted proposal advanced automatically to agreement preparation.";href="/admin#contracting"}
  else if(x.event_type==="AGREEMENT_SETUP_REQUIRED"){label="SETUP";title="Agreement setup required · "+x.brand_name;href="/admin#contracting"}
  else if(x.event_type==="AGREEMENT_SIGNED"){label="SIGNED";title="Agreement signed · "+x.brand_name;note="Signature completion was verified against the provider record.";href="/admin#commercial-lifecycle"}
  else if(x.event_type==="PAYMENT_REQUIRED"){label="PAYMENT";title="Payment required · "+x.brand_name;note="The agreement is signed and the required payment gate remains open.";href="/admin#commercial-lifecycle"}
  else if(x.event_type==="PAYMENT_CONFIRMED"){label="PAID";title="Payment confirmed · "+x.brand_name;note="Stripe confirmed the payment provider-side.";href="/admin#commercial-lifecycle"}
  else if(x.event_type==="CLIENT_EMAIL_RECEIVED"){label="REPLY";title="Client email received · "+x.brand_name;note="A reply was synchronized from Gmail into the relationship record.";href="/admin/communications?thread="+encodeURIComponent(String(p.thread_id||""))}
  else if(x.event_type==="DELIVERY_READY_FOR_ACTIVATION"){label="READY";title="Delivery ready to activate · "+x.brand_name;note="Signature and required payment gates are satisfied.";href="/admin#commercial-lifecycle"}
  return <div key={x.id}><time>{label}</time><strong>{title}</strong><small>{note||String(x.event_type).replaceAll("_"," ")}</small><span><Link href={href}>Open →</Link> <button type="button" disabled={busy===x.id} onClick={()=>dismiss(x.id)}>{busy===x.id?"Clearing…":"Dismiss"}</button></span></div>})}</div>}
 </section>
}
"use client";
import {useState} from "react";
export default function AcceptProposal({proposalId,access}:{proposalId:string;access:string}){
 const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 async function accept(){setBusy(true);setMessage("");try{const r=await fetch(`/api/public/proposals/${proposalId}/accept`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({access,clientEmail:email||null})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Unable to accept proposal");setMessage("Proposal accepted. Thank you.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to accept proposal");}finally{setBusy(false)}}
 return <div style={{marginTop:32,paddingTop:24,borderTop:"1px solid #ddd"}}><h2>Accept Proposal</h2><p>Confirm that you accept this proposal as presented. Contract signature and payment, when applicable, are separate steps.</p><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email (optional)" style={{padding:10,width:"100%",maxWidth:420,marginBottom:12}}/><br/><button onClick={accept} disabled={busy} style={{padding:"12px 18px"}}>{busy?"Accepting…":"Accept Proposal"}</button>{message&&<p>{message}</p>}</div>;
}

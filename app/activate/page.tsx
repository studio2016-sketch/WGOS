"use client";
import {FormEvent,useEffect,useState} from "react";
import {useRouter} from "next/navigation";

export default function Activate(){
 const router=useRouter();
 const [email,setEmail]=useState("");
 const [name,setName]=useState("Jermaine Williams");
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 useEffect(()=>{const q=new URLSearchParams(window.location.search);const e=q.get("email");if(e)setEmail(e)},[]);

 async function submit(e:FormEvent){
  e.preventDefault();setError("");setMessage("");
  if(password.length<8){setError("Password must be at least 8 characters.");return}
  if(password!==confirm){setError("Passwords do not match.");return}
  setBusy(true);
  const r=await fetch("/api/auth/sign-up/email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,name,password})});
  let d:any={};try{d=await r.json()}catch{}
  if(!r.ok){setError(d?.message||d?.error||"Unable to activate this WGOS identity.");setBusy(false);return}
  const me=await fetch("/api/me",{cache:"no-store"});
  if(me.ok){router.replace("/work");router.refresh();return}
  setMessage("Account created. If email verification is required, return to Sign In and request a verification code.");
  setBusy(false);
 }

 return <main className="admin"><section className="principle" style={{maxWidth:720,margin:"10vh auto"}}>
  <p className="eyebrow">WGOS · INVITED ACCESS</p>
  <h1>Activate Your Operating Login</h1>
  <p>Create the password for your invited WGOS identity. Brand access is assigned separately and cannot be expanded by creating an account.</p>
  <form onSubmit={submit} style={{display:"grid",gap:14,marginTop:28}}>
   <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Name<input required value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>Password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <label>Confirm password<input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
   <button className="primary" disabled={busy}>{busy?"Activating…":"Activate WGOS Login →"}</button>
  </form>
  {message&&<p className="muted">{message}</p>}
  {error&&<p className="muted">{error}</p>}
  <p className="privateNote">This activation only works as a WGOS operating identity when the email has a pending server-side access invitation.</p>
 </section></main>
}

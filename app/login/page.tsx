"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

export default function Login(){
 const router=useRouter();
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");

 async function signIn(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/sign-in/email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,rememberMe:true})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok){
   const me=await fetch("/api/me",{cache:"no-store"});
   let who:any={};try{who=await me.json()}catch{}
   const role=String(who?.user?.role||"");
   router.replace(["OWNER","ADMIN"].includes(role)?"/admin":"/work");
   router.refresh();
  }else{
   const msg=String(d?.message||d?.error||"Unable to sign in.");
   setError(msg);
   if(/email.*not.*verified/i.test(msg))setMessage("Your password is valid, but your email still needs verification. Use “Send Verification Email” below.");
   setBusy(false)
  }
 }

 async function reset(){
  if(!email){setError("Enter your email first.");return}
  setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/request-password-reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,redirectTo:window.location.origin+"/reset-password"})});
  if(r.ok)setMessage("If this account is eligible, Neon Auth has sent a secure password setup/reset link.");
  else setError("Unable to start password setup right now.");
  setBusy(false);
 }

 async function verify(){
  if(!email){setError("Enter your email first.");return}
  setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/send-verification-email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,callbackURL:window.location.origin+"/login?verified=success"})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok)setMessage("Verification email sent. Open the newest WGOS verification email and click its verification link.");
  else setError(d?.message||d?.error||"Unable to send a verification email right now.");
  setBusy(false);
 }

 return <main className="admin"><section className="principle" style={{maxWidth:720,margin:"10vh auto"}}>
  <p className="eyebrow">WGOS · SECURE ACCESS</p><h1>Command Center Access</h1>
  <p>Sign in with your authorized WGOS identity. Authentication is provided by Neon Auth; WGOS authorization is separately enforced by the app-user role table.</p>
  <form onSubmit={signIn} style={{display:"grid",gap:14,marginTop:28}}>
   <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button className="primary" disabled={busy}>{busy?"Working…":"Sign In →"}</button>
  </form>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
   <button type="button" disabled={busy} onClick={verify}>Send Verification Email</button>
   <button type="button" disabled={busy} onClick={reset}>Set / Reset Password</button>
  </div>
  {message&&<p className="muted">{message}</p>}
  {error&&<p className="muted">{error}</p>}
  <p className="privateNote">Creating an Auth account alone does not grant WGOS access. OWNER/ADMIN permissions control executive and administrative areas; active TEAM users are limited to the Work workspace and permitted task actions.</p>
 </section></main>
}

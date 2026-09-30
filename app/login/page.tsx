"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

export default function Login(){
 const router=useRouter();
 const [email,setEmail]=useState("");
 const [password,setPassword]=useState("");
 const [otp,setOtp]=useState("");
 const [showOtp,setShowOtp]=useState(false);
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
   if(/email.*not.*verified/i.test(msg)){setShowOtp(true);setMessage("Your password is valid, but your email still needs verification. Send a code below.");}
   setBusy(false)
  }
 }

 async function sendOtp(){
  if(!email){setError("Enter your email first.");return}
  setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/email-otp/send-verification-otp",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,type:"email-verification"})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok){setShowOtp(true);setMessage("Verification code sent. Enter the 6-digit code from the newest WGOS email below.");}
  else setError(d?.message||d?.error||"Unable to send a verification code right now.");
  setBusy(false);
 }

 async function verifyOtp(e:FormEvent){
  e.preventDefault();
  if(!email){setError("Enter your email first.");return}
  if(!/^\d{6}$/.test(otp)){setError("Enter the 6-digit verification code.");return}
  setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/email-otp/verify-email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,otp})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok){setShowOtp(false);setOtp("");setMessage("Email verified successfully. You can sign in now.");}
  else setError(d?.message||d?.error||"That verification code could not be accepted. Request a fresh code and try again.");
  setBusy(false);
 }

 async function reset(){
  if(!email){setError("Enter your email first.");return}
  setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/request-password-reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,redirectTo:window.location.origin+"/reset-password"})});
  if(r.ok)setMessage("If this account is eligible, Neon Auth has sent a secure password setup/reset link.");
  else setError("Unable to start password setup right now.");
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
   <button type="button" disabled={busy} onClick={sendOtp}>Send Verification Code</button>
   <button type="button" disabled={busy} onClick={reset}>Set / Reset Password</button>
  </div>
  {showOtp&&<form onSubmit={verifyOtp} style={{display:"grid",gap:12,marginTop:20}}>
   <label>6-digit verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}/></label>
   <button className="primary" disabled={busy}>{busy?"Verifying…":"Verify Email →"}</button>
  </form>}
  {message&&<p className="muted">{message}</p>}
  {error&&<p className="muted">{error}</p>}
  <p className="privateNote">Creating an Auth account alone does not grant WGOS access. OWNER/ADMIN permissions control executive and administrative areas; active TEAM users are limited to the Work workspace and permitted task actions.</p>
 </section></main>
}

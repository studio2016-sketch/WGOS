"use client";
import {FormEvent,useEffect,useState} from "react";
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
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).get("reset")==="success")
   setMessage("Your password has been set. Sign in with your email and new password.");
 },[]);

 async function signIn(e:FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  const r=await fetch("/api/auth/sign-in/email",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,rememberMe:true})});
  let d:any={};try{d=await r.json()}catch{}
  if(r.ok){
   const me=await fetch("/api/me",{cache:"no-store"});
   let who:any={};try{who=await me.json()}catch{}
   const role=String(who?.user?.role||"");
   const ownerWorkspace=Boolean(who?.user?.ownerWorkspace);
   router.replace(["OWNER","ADMIN"].includes(role)||ownerWorkspace?"/admin":"/work");
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
  try{
   const r=await fetch("/api/auth/request-password-reset",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:email.trim(),redirectTo:window.location.origin+"/reset-password"}),signal:AbortSignal.timeout(20000)});
   if(r.ok)setMessage("Request accepted. If your account is eligible, check your inbox and spam folder for a password setup email. Open its link to choose your new password.");
   else setError("Password setup could not be requested. Please try again shortly.");
  }catch{
   setError("The password setup request could not complete. Check your connection and try again.");
  }finally{
   setBusy(false);
  }
 }

 return <main className="admin"><section className="principle" style={{maxWidth:720,margin:"10vh auto"}}>
  <p className="eyebrow">WGOS · SECURE ACCESS</p><h1>Command Center Access</h1>
  <p>Sign in with your authorized WGOS identity. Authentication is provided by Neon Auth; WGOS authorization is separately enforced by the app-user role table.</p>
  {message&&<p role="status" aria-live="polite">{message}</p>}
  {error&&<p role="alert">{error}</p>}
  <p>First time here or forgot your password? Enter your email, then select “Email Password Setup Link”. Open the link in that email to set your password.</p>
  <form onSubmit={signIn} style={{display:"grid",gap:14,marginTop:28}}>
   <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   <button className="primary" disabled={busy}>{busy?"Working…":"Sign In →"}</button>
  </form>
  <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}>
   <button type="button" disabled={busy} onClick={sendOtp}>Send Verification Code</button>
   <button type="button" disabled={busy} onClick={reset}>Email Password Setup Link</button>
  </div>
  {showOtp&&<form onSubmit={verifyOtp} style={{display:"grid",gap:12,marginTop:20}}>
   <label>6-digit verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}/></label>
   <button className="primary" disabled={busy}>{busy?"Verifying…":"Verify Email →"}</button>
  </form>}

  <p className="privateNote">Creating an Auth account alone does not grant WGOS access. Your assigned WGOS role and brand memberships determine exactly which command areas and businesses you can access. Master-only financial, legal, and system controls remain protected.</p>
 </section></main>
}

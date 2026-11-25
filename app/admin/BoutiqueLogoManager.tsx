"use client";
import {FormEvent,useEffect,useRef,useState} from "react";

type Logo={logoUrl:string|null;width:number|null;height:number|null};
export default function BoutiqueLogoManager(){
 const [logo,setLogo]=useState<Logo|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState(""),[error,setError]=useState("");
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  let cancelled=false;
  fetch("/api/admin/boutique-logo",{cache:"no-store"}).then(async response=>{
   if(!response.ok)throw Error("Could not load official logo settings.");
   return response.json();
  }).then(data=>{if(!cancelled)setLogo(data)})
   .catch(error=>{if(!cancelled)setError(error instanceof Error?error.message:"Unable to load logo.")});
  return()=>{cancelled=true};
 },[]);
 async function upload(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const file=input.current?.files?.[0];
  if(!file){setError("Select Dionne’s Boutique's approved PNG logo.");return}
  if(file.type!=="image/png"||file.size>3000000||file.size<1024){
   setError("Choose the original transparent PNG file (up to 3 MB).");return;
  }
  setBusy(true);setMessage("");setError("");
  try{
   const data=new FormData();data.set("logo",file);
   const response=await fetch("/api/admin/boutique-logo",{method:"POST",body:data,signal:AbortSignal.timeout(35000)});
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||"Logo upload failed.");
   setLogo({logoUrl:result.logoUrl,width:result.width,height:result.height});
   setMessage("Official full-resolution logo published. The storefront will now load this approved asset without a GitHub deployment.");
   if(input.current)input.current.value="";
  }catch(error){setError(error instanceof Error?error.message:"Upload failed.");}
  finally{setBusy(false)}
 }
 return <section className="adminPanel" id="boutique-brand-logo" style={{marginTop:20}}>
  <h2>Official Boutique Logo</h2>
  <p>Upload the exact approved transparent PNG here to update the storefront hero, header, footer and promotion branding. WGOS publishes the original file without resizing, regeneration or recoloring.</p>
  {logo?.logoUrl?
   <div style={{display:"flex",flexWrap:"wrap",gap:15,alignItems:"center",padding:16,background:"#f7f2e9",border:"1px solid #d6c4a3",marginBottom:12}}>
    <img src={logo.logoUrl} alt="Current approved Dionne’s Boutique logo" style={{display:"block",width:160,height:160,objectFit:"contain"}}/>
    <div><strong>Current published logo</strong><p>{logo.width} × {logo.height} pixels</p><a target="_blank" rel="noreferrer" href={logo.logoUrl}>View full-resolution asset</a></div>
   </div>:
   <p className="muted">No full-resolution logo has been published through WGOS yet. The storefront is using its original fallback.</p>}
  <form onSubmit={upload} style={{display:"grid",gap:12,maxWidth:450}}>
   <label>Approved logo PNG <input ref={input} type="file" accept="image/png" required disabled={busy}/></label>
   <button type="submit" className="primary" disabled={busy}>{busy?"Uploading approved artwork…":"Publish Official Logo"}</button>
   {message&&<p role="status">{message}</p>}
   {error&&<p role="alert" style={{color:"#a32f1b"}}>{error}</p>}
  </form>
 </section>
}

"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

type Product={id:number;brand:string;name:string;variant:string;photo:string|null};
export default function BoutiqueProductImageManager({products}:{products:Product[]}){
 const router=useRouter();
 const sorted=[...products].sort((a,b)=>a.id-b.id);
 const [id,setId]=useState<number>(sorted[0]?.id??1),[busy,setBusy]=useState(false);
 const [error,setError]=useState(""),[message,setMessage]=useState("");
 const current=sorted.find(p=>p.id===id);
 async function publish(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!current)return;
  const form=event.currentTarget;
  const data=new FormData(form);
  const file=data.get("photo");
  if(!(file instanceof File)||!["image/jpeg","image/png"].includes(file.type)||file.size>4000000){
   setError("Select a clear PNG or JPEG photograph under 4 MB.");return;
  }
  setBusy(true);setError("");setMessage("");
  try{
   data.set("productId",String(id));
   const r=await fetch("/api/admin/boutique-product-photo",{
    method:"POST",body:data,signal:AbortSignal.timeout(35000)
   });
   const response=await r.json();
   if(!r.ok||!response.ok)throw Error(response.error||"Could not publish the photograph.");
   setMessage("Published high-resolution photo for "+current.brand+" "+current.name+". The live boutique listing will update automatically.");
   form.reset();router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to publish photo.")}
  finally{setBusy(false)}
 }
 return <section className="adminPanel" id="boutique-product-photos" style={{marginTop:20}}>
  <h2>Product Photography</h2>
  <p>Replace an unclear, broken or missing reference with your approved original photograph. Images must be PNG or JPEG, at least 700×700 pixels, and under 4 MB. Photos are connected to the exact catalog ID and published to the boutique automatically.</p>
  <form onSubmit={publish} style={{display:"grid",gap:12,maxWidth:540}}>
   <label>Choose the exact boutique listing
    <select value={id} onChange={event=>{setId(Number(event.target.value));setError("");setMessage("")}}>
     {sorted.map(p=><option value={p.id} key={p.id}>{String(p.id).padStart(2,"0")} · {p.brand} {p.name} · {p.variant||"Standard"}</option>)}
    </select>
   </label>
   <p><strong>{current?.brand} {current?.name}</strong> — {current?.variant||"Standard"} · Catalog #{id}</p>
   <label>Approved product photograph
    <input name="photo" type="file" accept="image/png,image/jpeg" required disabled={busy}/>
   </label>
   <button type="submit" className="primary" disabled={busy||!current}>{busy?"Publishing photo…":"Publish Product Photo"}</button>
   {message&&<p role="status">{message}</p>}
   {error&&<p role="alert" style={{color:"#a32f1b"}}>{error}</p>}
  </form>
 </section>
}

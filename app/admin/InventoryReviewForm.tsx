"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";

export default function InventoryReviewForm({brandId,product,locations,stockLevels}:{brandId:string;product:any;locations:any[];stockLevels:any[]}){
 const router=useRouter();
 const [locationId,setLocationId]=useState(locations[0]?.id||"");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const stock=stockLevels.find(item=>item.product_id===product.product_id&&item.location_id===locationId);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const data=new FormData(event.currentTarget);
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/admin/inventory/review",{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(20000),
    body:JSON.stringify({brandId,productId:product.product_id,productRevision:product.review_revision,locationId,stockRevision:stock?.review_revision??null,
     count:Number(data.get("count")),condition:data.get("condition"),sellable:data.get("sellable")==="on",
     countConfirmed:data.get("countConfirmed")==="on",conditionConfirmed:data.get("conditionConfirmed")==="on"})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to save review.");
   setMessage("Quantity and condition confirmed.");router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"Unable to save review.");}
  finally{setBusy(false);}
 }
 return <details className="adminPanel" style={{gridColumn:"1 / -1"}}>
  <summary>Review quantity &amp; condition</summary>
  <form key={locationId} onSubmit={save} style={{display:"grid",gap:14,marginTop:18}}>
   <label>Stock location<select value={locationId} onChange={event=>{setLocationId(event.target.value);setError("");setMessage("");}}>{locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
   <p>Recorded at this location · {Number(stock?.on_hand||0)} on hand, {Number(stock?.reserved||0)} reserved.</p>
   <label>Physical quantity counted<input key={locationId} name="count" type="number" required min={Number(stock?.reserved||0)} max="99999999999.999" step="0.001" inputMode="decimal"/></label>
   <label>Inspected condition<select name="condition" required defaultValue={product.condition_status==="UNKNOWN"?"":product.condition_status}>
    <option value="" disabled>Choose a condition</option><option value="NEW">New</option><option value="OPEN_BOX">Open box</option><option value="USED">Used</option><option value="DAMAGED">Damaged</option><option value="HOLD">Hold for review</option>
   </select></label>
   <label><input type="checkbox" style={{width:"auto",minHeight:0}} name="countConfirmed" required/> I physically confirmed this quantity.</label>
   <label><input type="checkbox" style={{width:"auto",minHeight:0}} name="conditionConfirmed" required/> I inspected the product condition.</label>
   <label><input type="checkbox" style={{width:"auto",minHeight:0}} name="sellable" defaultChecked={Boolean(product.sellable)}/> Approve this product for sale.</label>
   <button disabled={busy||!locationId}>{busy?"Saving…":"Save Review"}</button>
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  </form>
 </details>;
}

"use client";
import {FormEvent,useState} from "react";
import {useRouter} from "next/navigation";
export default function BoutiqueSettings({saved,taxStatus}:{saved:any;taxStatus:any}){
 const router=useRouter(),s=saved.settings||{};
 const [version,setVersion]=useState(Number(saved.version||0)),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const data=new FormData(event.currentTarget);setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/admin/boutique-settings",{method:"PUT",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(25000),body:JSON.stringify({version,settings:{
    shippingEnabled:data.get("shippingEnabled")==="on",shippingCents:data.get("shippingAmount")===""?null:Math.round(Number(data.get("shippingAmount"))*100),
    minDays:Number(data.get("minDays")),maxDays:Number(data.get("maxDays")),taxMode:data.get("taxMode"),taxCode:data.get("taxCode"),
    taxBehavior:data.get("taxBehavior"),taxConfirmed:data.get("taxConfirmed")==="on"
   }})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to save settings.");
   setVersion(result.version);setMessage("Settings saved for checkout preparation.");router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"Unable to save settings.");}
  finally{setBusy(false);}
 }
 return <details className="adminPanel" id="boutique-settings">
  <summary><strong>Boutique Settings · Shipping &amp; Tax</strong></summary>
  <form onSubmit={save} style={{display:"grid",gap:16,marginTop:18}}>
   <h3>US shipping</h3>
   <label><input style={{width:"auto"}} type="checkbox" name="shippingEnabled" defaultChecked={Boolean(s.shippingEnabled)}/> Offer flat-rate US delivery</label>
   <div className="inventoryEntryFields">
    <label>Shipping charge per order ($)<input name="shippingAmount" type="number" min="0" max="1000" step="0.01" defaultValue={s.shippingCents==null?"":s.shippingCents/100}/></label>
    <label>Estimated delivery · minimum business days<input name="minDays" type="number" min="1" max="60" step="1" defaultValue={s.minDays??""}/></label>
    <label>Estimated delivery · maximum business days<input name="maxDays" type="number" min="1" max="60" step="1" defaultValue={s.maxDays??""}/></label>
   </div>
   <h3>Tax collection</h3>
   <p>{taxStatus?("Stripe Tax settings · "+taxStatus.status+". Active US registrations · "+taxStatus.activeUsRegistrations.length+"."):"Stripe Tax status could not be loaded. Refresh before approving tax collection."}</p>
   {taxStatus?.activeUsRegistrations?.length===0&&<p role="status">Stripe has no active US tax registrations listed. Confirm your registered jurisdictions before enabling automatic tax collection.</p>}
   <div className="inventoryEntryFields">
    <label>Tax setup<select name="taxMode" defaultValue={s.taxMode||"PENDING"}><option value="PENDING">Pending review</option><option value="AUTOMATIC">Automatic Stripe Tax</option></select></label>
    <label>Default product tax code<input name="taxCode" pattern="txcd_[0-9]{8}" defaultValue={s.taxCode||taxStatus?.presetTaxCode||""}/></label>
    <label>Prices include or exclude tax<select name="taxBehavior" defaultValue={s.taxBehavior||taxStatus?.presetTaxBehavior||""}><option value="">Choose price treatment</option><option value="exclusive">Tax added to listed prices</option><option value="inclusive">Tax included in listed prices</option></select></label>
   </div>
   <p>The default tax code applies to every storefront product. Confirm it matches the merchandise before using it. <a href="https://docs.stripe.com/tax/tax-codes">Review Stripe’s product tax codes</a>.</p>
   <label><input style={{width:"auto"}} name="taxConfirmed" type="checkbox"/> I confirm the default product tax code and price treatment.</label>
   <button disabled={busy}>{busy?"Saving…":"Save Shipping & Tax Settings"}</button>
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  </form>
 </details>;
}

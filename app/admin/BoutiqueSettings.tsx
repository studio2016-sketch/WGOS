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
    freeShippingThresholdCents:data.get("freeShippingThreshold")===""?null:Math.round(Number(data.get("freeShippingThreshold"))*100),
    minDays:Number(data.get("minDays")),maxDays:Number(data.get("maxDays")),taxMode:data.get("taxMode"),taxCode:data.get("taxCode"),
    taxBehavior:"exclusive",taxConfirmed:data.get("taxConfirmed")==="on"
   }})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Unable to save settings.");
   setVersion(result.version);setMessage(data.get("shippingEnabled")==="on"?"Shipping and tax configuration saved. Live checkout still requires separate launch approval.":"Tax configuration saved. Shipping is OFF, so checkout remains unavailable until you enable shipping and set its charge and delivery estimates.");router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"Unable to save settings.");}
  finally{setBusy(false);}
 }
 return <details className="adminPanel" id="boutique-settings" open>
  <summary><strong>Boutique Settings · Shipping &amp; Tax</strong></summary>
  <form onSubmit={save} style={{display:"grid",gap:16,marginTop:18}}>
   <div className="principle" role="status"><strong>{s.shippingEnabled?"US shipping is configured":"Shipping is currently OFF"}</strong><p>{s.shippingEnabled?`Saved delivery charge: ${(Number(s.shippingCents||0)/100).toFixed(2)} per order${s.freeShippingThresholdCents!=null?` · Free over ${(Number(s.freeShippingThresholdCents)/100).toFixed(2)}`:""}. Estimated delivery: ${s.minDays}–${s.maxDays} business days.`:"Checkout cannot begin while shipping is off. Enable US delivery and enter a rate plus minimum and maximum delivery days, then save."}</p><p>Tax setup: {s.taxMode==="AUTOMATIC"?`Automatic Stripe Tax · ${s.taxCode||"Tax code not set"}`:"Not approved for automatic calculation"}. Saving settings does not enable live payments.</p></div>
   <h3>US shipping</h3>
   <label><input style={{width:"auto"}} type="checkbox" name="shippingEnabled" defaultChecked={Boolean(s.shippingEnabled)}/> Offer flat-rate US delivery</label>
   <div className="inventoryEntryFields">
    <label>Standard US shipping charge per order ($)<input name="shippingAmount" type="number" min="0" max="1000" step="0.01" defaultValue={s.shippingCents==null?"":s.shippingCents/100}/></label>
    <label>Free shipping when merchandise subtotal reaches ($) · optional<input name="freeShippingThreshold" type="number" min="0" max="100000" step="0.01" placeholder="Leave blank to disable" defaultValue={s.freeShippingThresholdCents==null?"":s.freeShippingThresholdCents/100}/></label>
    <label>Estimated delivery · minimum business days<input name="minDays" type="number" min="1" max="60" step="1" defaultValue={s.minDays??""}/></label>
    <label>Estimated delivery · maximum business days<input name="maxDays" type="number" min="1" max="60" step="1" defaultValue={s.maxDays??""}/></label>
   </div>
   <p className="muted">Shipping changes in WGOS apply to new Dionne’s Boutique checkout sessions. A free-shipping threshold applies to merchandise subtotal before tax; leave it blank to charge the standard rate on every order.</p>
   <h3>Tax collection</h3>
   <p>{taxStatus?("Stripe Tax settings · "+taxStatus.status+". Active US registrations · "+taxStatus.activeUsRegistrations.length+"."):"Stripe Tax status could not be loaded. Refresh before approving tax collection."}</p>
   {taxStatus?.activeUsRegistrations?.length===0&&<p role="status">Stripe has no active US tax registrations listed. Confirm your registered jurisdictions before enabling automatic tax collection.</p>}
   {taxStatus?.activeUsRegistrations?.length>0&&<p className="muted">Active registered US states: {taxStatus.activeUsRegistrations.map((r:any)=>r.state||"Unknown").join(", ")}.</p>}
   <div className="inventoryEntryFields">
    <label>Tax setup<select name="taxMode" defaultValue={s.taxMode||"PENDING"}><option value="PENDING">Pending review</option><option value="AUTOMATIC">Automatic Stripe Tax</option></select></label>
    <label>Default product tax code<input name="taxCode" pattern="txcd_[0-9]{8}" defaultValue={s.taxCode||taxStatus?.presetTaxCode||""}/></label>
    <p>Tax is added to listed prices at checkout.</p>
   </div>
   <p>Stripe Tax calculates the applicable tax from the delivery address, product classification, and the business’s tax registrations. WGOS manages the automatic-tax setting and product tax code, not statutory rates. Sales tax is added at checkout where collection applies. <a href="https://docs.stripe.com/tax/tax-codes" target="_blank" rel="noreferrer">Review Stripe’s product tax codes</a>.</p>
   <label><input style={{width:"auto"}} name="taxConfirmed" type="checkbox"/> I confirm the default product tax code and price treatment.</label>
   <button disabled={busy}>{busy?"Saving…":"Save Shipping & Tax Settings"}</button>
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  </form>
 </details>;
}

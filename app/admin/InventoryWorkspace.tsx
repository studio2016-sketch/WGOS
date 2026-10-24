"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

export default function InventoryWorkspace({brandId,snapshot}:{brandId:string;snapshot:any}){
 const router=useRouter();const [busy,setBusy]=useState("");const [error,setError]=useState("");
 const products=snapshot.products||[],locations=snapshot.locations||[];const location=locations[0];
 const totals=useMemo(()=>products.reduce((a:any,p:any)=>({on:a.on+Number(p.on_hand||0),available:a.available+Number(p.available||0),retail:a.retail+Number(p.retail_value_cents||0)}),{on:0,available:0,retail:0}),[products]);
 async function adjust(productId:string,delta:number,type="ADJUSTMENT"){
  if(!location)return;setBusy(productId);setError("");
  try{const r=await fetch("/api/admin/inventory/adjust",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brandId,productId,locationId:location.id,quantityDelta:delta,movementType:type})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to adjust inventory");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to adjust inventory");}finally{setBusy("");}
 }
 return <section className="cinematicWorkspace inventoryWorkspace">
  <div className="workspaceTitle"><div><p className="eyebrow">RETAIL INVENTORY · SHADOW CONTROL</p><h2>Inventory Command</h2><p className="muted">WGOS is tracking a private inventory copy. It is not controlling Dionne’s live storefront yet.</p></div><span className="status">{snapshot.state?.mode||"SHADOW"}</span></div>
  {error&&<p className="lifecycleMessage">{error}</p>}
  <div className="resourceSignals"><span><b>{products.length}</b> PRODUCTS</span><span><b>{totals.on}</b> ON HAND</span><span><b>{totals.available}</b> AVAILABLE</span><span><b>{"$"+(totals.retail/100).toFixed(2)}</b> RETAIL VALUE</span></div>
  <section className="adminPanel"><div className="equipmentHead"><div><p className="eyebrow">CATALOG + STOCK</p><h3>Dionne’s Boutique</h3></div><small>{snapshot.state?.reconciliation_status||"NOT_STARTED"} · cutover {snapshot.state?.cutover_ready?"ready":"locked"}</small></div>
   {!products.length?<p className="muted">No shadow inventory imported yet. The control plane is ready for the catalog migration.</p>:
   <div className="inventoryTable">{products.map((p:any)=><article className="inventoryRow" key={p.product_id}>
    <div className="inventoryProduct">{p.image_url&&<img src={p.image_url} alt=""/>}<div><small>{p.category||"PRODUCT"} · {p.manufacturer||""}</small><strong>{p.product_name}</strong><span>{p.variant_name||"Standard"} · {p.condition_status}</span></div></div>
    <div><small>PRICE</small><strong>{"$"+(Number(p.price_cents||0)/100).toFixed(2)}</strong></div>
    <div><small>ON HAND</small><strong>{Number(p.on_hand||0)}</strong><span>{Number(p.available||0)} available</span></div>
    <div className="inventoryActions"><button disabled={busy===p.product_id} onClick={()=>adjust(p.product_id,1,"RECEIPT")}>＋ Receive</button><button disabled={busy===p.product_id||Number(p.on_hand||0)<=0} onClick={()=>adjust(p.product_id,-1,"ADJUSTMENT")}>− Adjust</button></div>
   </article>)}</div>}
  </section>
  <section className="principle"><strong>Cutover rule:</strong> no storefront authority until catalog, quantities, pricing and image references are reconciled and explicitly approved.</section>
 </section>;
}

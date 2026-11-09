"use client";
import {FormEvent,useMemo,useRef,useState} from "react";
import InventoryReviewForm from "./InventoryReviewForm";
import {useRouter} from "next/navigation";

export default function InventoryWorkspace({brandId,brandName,snapshot,canManage}:{brandId:string;brandName:string;snapshot:any;canManage:boolean}){
 const router=useRouter();const [busy,setBusy]=useState("");const [error,setError]=useState("");
 const [adding,setAdding]=useState(false);const [message,setMessage]=useState("");
 const requestId=useRef<string|null>(null);
 async function createProduct(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const form=event.currentTarget;const values=new FormData(form);
  requestId.current??=crypto.randomUUID();
  setBusy("create");setError("");setMessage("");
  try{
   const response=await fetch("/api/admin/inventory",{method:"POST",headers:{"content-type":"application/json"},signal:AbortSignal.timeout(25000),body:JSON.stringify({
    brandId,requestId:requestId.current,productName:values.get("productName"),sku:values.get("sku"),category:values.get("category"),
    variantName:values.get("variantName"),price:values.get("price"),cost:values.get("cost")||null,
    imageUrl:values.get("imageUrl"),openingQuantity:Number(values.get("openingQuantity")||0),locationId:values.get("locationId")||undefined,sellable:false
   })});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Unable to save product.");
   form.reset();requestId.current=null;setAdding(false);setMessage("Product added to "+brandName+".");router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"Unable to save product. Please retry.");}
  finally{setBusy("");}
 }
 async function importCatalog(){
  if(busy)return;setBusy("import");setError("");setMessage("");
  try{
   const response=await fetch("/api/admin/inventory/import",{method:"POST",signal:AbortSignal.timeout(30000)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Unable to import catalog.");
   setMessage(data.imported+" products imported. "+data.skipped+" already present. Confirm physical counts and conditions.");router.refresh();
  }catch(error){setError(error instanceof Error?error.message:"Unable to import catalog. Please retry.");}
  finally{setBusy("");}
 }
 const products=snapshot.products||[],locations=snapshot.locations||[];const location=locations[0];
 const totals=useMemo(()=>products.reduce((a:any,p:any)=>({on:a.on+Number(p.on_hand||0),available:a.available+Number(p.available||0),retail:a.retail+Number(p.retail_value_cents||0)}),{on:0,available:0,retail:0}),[products]);
 async function adjust(productId:string,delta:number,type="ADJUSTMENT"){
  if(!location)return;setBusy(productId);setError("");
  try{const r=await fetch("/api/admin/inventory/adjust",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brandId,productId,locationId:location.id,quantityDelta:delta,movementType:type})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to adjust inventory");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to adjust inventory");}finally{setBusy("");}
 }
 return <section className="cinematicWorkspace inventoryWorkspace">
  <div className="workspaceTitle"><div><p className="eyebrow">RETAIL INVENTORY · SHADOW CONTROL</p><h2>Inventory Command</h2><p className="muted">Manage products and stock for {brandName}. New entries are saved in WGOS’s private inventory catalog.</p></div><span className="status">{snapshot.state?.mode||"SHADOW"}</span></div>
  {error&&<p className="lifecycleMessage" role="alert">{error}</p>}
  {message&&<p role="status">{message}</p>}
  {canManage&&<button type="button" className="primary" onClick={()=>{setAdding(!adding);setError("");}} disabled={Boolean(busy)}>{adding?"Close product form":"＋ Add Product"}</button>}
  {canManage&&brandId==="dionnesBoutique"&&<div className="adminPanel"><h3>Existing boutique catalog</h3><p>Import the saved storefront catalog, recorded quantities, prices, and image references. Existing products and edits are preserved. Imported counts and conditions need confirmation.</p><button type="button" disabled={Boolean(busy)} onClick={importCatalog}>{busy==="import"?"Importing…":"Import Existing Catalog"}</button></div>}
  {adding&&<form className="adminPanel inventoryEntryForm" onSubmit={createProduct} onChange={()=>{requestId.current=null;}}>
   <h3>Add product to {brandName}</h3>
   <div className="inventoryEntryFields">
    <label>Product name<input name="productName" required maxLength={200}/></label>
    <label>SKU / item code<input name="sku" maxLength={100}/></label>
    <label>Category<input name="category" maxLength={100}/></label>
    <label>Variant / size / color<input name="variantName" maxLength={200}/></label>
    <label>Selling price ($)<input name="price" type="number" inputMode="decimal" min="0" step="0.01" required defaultValue="0"/></label>
    <label>Unit cost ($)<input name="cost" type="number" inputMode="decimal" min="0" step="0.01"/></label>
    <label>Starting quantity<input name="openingQuantity" type="number" inputMode="decimal" min="0" max="99999999999.999" step="0.001" defaultValue="0" required disabled={!locations.length}/></label>
    <label>Stock location<select name="locationId" defaultValue={location?.id||""} disabled={!locations.length}>{locations.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Photo URL<input name="imageUrl" type="url" placeholder="https://" maxLength={2000}/></label>
   </div>
   {!locations.length&&<p role="status">A stock location must be configured before adding quantities. You can save the product with zero stock now.</p>}
   <button className="primary" disabled={Boolean(busy)}>{busy==="create"?"Saving…":"Save Product"}</button>
  </form>}
  <div className="resourceSignals"><span><b>{products.length}</b> PRODUCTS</span><span><b>{totals.on}</b> ON HAND</span><span><b>{totals.available}</b> AVAILABLE</span><span><b>{"$"+(totals.retail/100).toFixed(2)}</b> RETAIL VALUE</span></div>
  <section className="adminPanel"><div className="equipmentHead"><div><p className="eyebrow">CATALOG + STOCK</p><h3>{brandName}</h3></div><small>{snapshot.state?.reconciliation_status||"NOT_STARTED"} · cutover {snapshot.state?.cutover_ready?"ready":"locked"}</small></div>
   {!products.length?<p className="muted">No products yet. Add your first product to begin.</p>:
   <div className="inventoryTable">{products.map((p:any)=><article className="inventoryRow" key={p.product_id}>
    <div className="inventoryProduct">{p.image_url&&<img src={p.image_url} alt=""/>}<div><small>{p.category||"PRODUCT"} · {p.manufacturer||""}</small><strong>{p.product_name}</strong><span>{p.variant_name||"Standard"} · {p.condition_status}</span><small>{p.metadata?.reviewedAt?(p.sellable?"Reviewed · approved for sale":"Reviewed · held from sale"):"Product review pending"}</small>{p.metadata?.needsStockConfirmation&&<small>Imported quantity · count confirmation pending</small>}{p.metadata?.sourceCondition&&<small>{p.metadata.sourceCondition}</small>}</div></div>
    <div><small>PRICE</small><strong>{"$"+(Number(p.price_cents||0)/100).toFixed(2)}</strong></div>
    <div><small>ON HAND</small><strong>{Number(p.on_hand||0)}</strong><span>{Number(p.available||0)} available</span></div>
    <div className="inventoryActions"><button disabled={!canManage||Boolean(busy)||!location} onClick={()=>adjust(p.product_id,1,"RECEIPT")}>＋ Receive</button><button disabled={!canManage||Boolean(busy)||!location||Number(p.on_hand||0)<=0} onClick={()=>adjust(p.product_id,-1,"ADJUSTMENT")}>− Adjust</button></div>
    {canManage&&<InventoryReviewForm key={p.product_id+String(p.review_revision)+JSON.stringify((snapshot.stockLevels||[]).filter((stock:any)=>stock.product_id===p.product_id).map((stock:any)=>stock.review_revision))} brandId={brandId} product={p} locations={locations} stockLevels={snapshot.stockLevels||[]}/>}
   </article>)}</div>}
  </section>
  <section className="principle"><strong>Cutover rule:</strong> no storefront authority until catalog, quantities, pricing and image references are reconciled and explicitly approved.</section>
 </section>;
}

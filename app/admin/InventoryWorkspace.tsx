"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

export default function InventoryWorkspace({brandId,snapshot}:{brandId:string;snapshot:any}){
 const router=useRouter();const [busy,setBusy]=useState("");const [error,setError]=useState("");const [adding,setAdding]=useState(false);const [productName,setProductName]=useState("");const [manufacturer,setManufacturer]=useState("");const [sku,setSku]=useState("");const [category,setCategory]=useState("");const [variantName,setVariantName]=useState("");const [price,setPrice]=useState("");const [cost,setCost]=useState("");const [imageUrl,setImageUrl]=useState("");const [uploading,setUploading]=useState(false);const [editingPhoto,setEditingPhoto]=useState("");const [galleryProduct,setGalleryProduct]=useState("");const [galleryPhotos,setGalleryPhotos]=useState<any[]>([]);
 const products=snapshot.products||[],locations=snapshot.locations||[];const location=locations[0];
 const totals=useMemo(()=>products.reduce((a:any,p:any)=>({on:a.on+Number(p.on_hand||0),available:a.available+Number(p.available||0),retail:a.retail+Number(p.retail_value_cents||0)}),{on:0,available:0,retail:0}),[products]);
 async function adjust(productId:string,delta:number,type="ADJUSTMENT"){
  if(!location)return;setBusy(productId);setError("");
  try{const r=await fetch("/api/admin/inventory/adjust",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brandId,productId,locationId:location.id,quantityDelta:delta,movementType:type})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to adjust inventory");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to adjust inventory");}finally{setBusy("");}
 }
 async function uploadImage(file:File){
  setUploading(true);setError("");
  try{
   const form=new FormData();form.append("brandId",brandId);form.append("image",file);
   const r=await fetch("/api/admin/inventory/upload",{method:"POST",body:form});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Image upload failed");
   setImageUrl(String(d.url||""));
  }catch(e){setError(e instanceof Error?e.message:"Image upload failed")}finally{setUploading(false)}
 }
 async function openGallery(productId:string){
  setGalleryProduct(productId);setError("");
  try{const r=await fetch("/api/admin/inventory/gallery?brandId="+encodeURIComponent(brandId)+"&productId="+encodeURIComponent(productId));const d=await r.json();if(!r.ok)throw new Error(d.error||"Gallery unavailable");setGalleryPhotos(d.photos||[])}catch(e){setError(e instanceof Error?e.message:"Gallery unavailable")}
 }
 async function addGalleryPhoto(productId:string,file:File){
  setEditingPhoto(productId);setError("");
  try{
   const form=new FormData();form.append("brandId",brandId);form.append("image",file);
   const upload=await fetch("/api/admin/inventory/upload",{method:"POST",body:form});
   const image=await upload.json();if(!upload.ok)throw new Error(image.error||"Upload failed");
   const save=await fetch("/api/admin/inventory/gallery",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brandId,productId,url:image.url})});
   const result=await save.json();if(!save.ok)throw new Error(result.error||"Gallery save failed");
   await openGallery(productId);
  }catch(e){setError(e instanceof Error?e.message:"Gallery upload failed")}finally{setEditingPhoto("")}
 }
 async function replacePhoto(productId:string,file:File){
  setEditingPhoto(productId);setError("");
  try{
   const form=new FormData();form.append("brandId",brandId);form.append("image",file);
   const upload=await fetch("/api/admin/inventory/upload",{method:"POST",body:form});
   const image=await upload.json();if(!upload.ok)throw new Error(image.error||"Photo upload failed");
   const save=await fetch("/api/admin/inventory",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({brandId,productId,imageUrl:image.url})});
   const result=await save.json();if(!save.ok)throw new Error(result.error||"Photo update failed");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to update photo")}finally{setEditingPhoto("")}
 }
 async function addProduct(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy("add");setError("");
  try{
   const r=await fetch("/api/admin/inventory",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({brandId,productName,manufacturer,sku,category,variantName,price:Number(price||0),cost:cost===""?null:Number(cost),imageUrl,sellable:false})});
   const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to add product");
   setAdding(false);setProductName("");setManufacturer("");setSku("");setCategory("");setVariantName("");setPrice("");setCost("");setImageUrl("");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to add product")}finally{setBusy("")}
 }
 return <section className="cinematicWorkspace inventoryWorkspace">
  <div className="workspaceTitle"><div><p className="eyebrow">RETAIL INVENTORY · SHADOW CONTROL</p><h2>Inventory Command</h2><p className="muted">WGOS is tracking a private inventory copy. It does not change the public storefront until an approved cutover.</p></div><span className="status">{snapshot.state?.mode||"SHADOW"}</span></div>
  <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"16px 0"}}>
   <button type="button" className="primary" onClick={()=>setAdding(v=>!v)}>{adding?"Close Product Entry":"＋ Add Product"}</button>
   <span className="muted">Products remain private until catalog reconciliation and approved cutover.</span>
  </div>
  {adding&&<form onSubmit={addProduct} className="adminPanel" style={{display:"grid",gap:14}}>
   <h3>Add a Product</h3><p className="muted">Create one item in the WGOS shadow catalog. This will not publish to the storefront.</p>
   <label>Product name *<input required value={productName} onChange={e=>setProductName(e.target.value)}/></label>
   <label>Brand / manufacturer<input value={manufacturer} onChange={e=>setManufacturer(e.target.value)}/></label>
   <label>SKU / barcode<input value={sku} onChange={e=>setSku(e.target.value)}/></label>
   <label>Category<input value={category} onChange={e=>setCategory(e.target.value)}/></label>
   <label>Variant / size<input value={variantName} onChange={e=>setVariantName(e.target.value)}/></label>
   <label>Retail price ($)<input type="number" min="0" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)}/></label>
   <label>Cost ($), optional<input type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label>
   <label>Upload product photo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading||busy==="add"} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(file)}}/></label>
   {uploading&&<p className="muted">Uploading image…</p>}
   {imageUrl&&<div><img src={imageUrl} alt="Product image preview" style={{maxWidth:180,maxHeight:180,objectFit:"contain",borderRadius:12}}/><p className="muted">Photo ready to save with product.</p></div>}
   <label>Or paste an image URL<input type="url" value={imageUrl} onChange={e=>setImageUrl(e.target.value)}/></label>
   <button className="primary" disabled={busy==="add"||uploading}>{busy==="add"?"Saving…":"Save to Shadow Catalog"}</button>
  </form>}
  {error&&<p className="lifecycleMessage">{error}</p>}
  <div className="resourceSignals"><span><b>{products.length}</b> PRODUCTS</span><span><b>{totals.on}</b> ON HAND</span><span><b>{totals.available}</b> AVAILABLE</span><span><b>{"$"+(totals.retail/100).toFixed(2)}</b> RETAIL VALUE</span></div>
  <section className="adminPanel"><div className="equipmentHead"><div><p className="eyebrow">CATALOG + STOCK</p><h3>{brandId==="bassOneBasses"?"Bass One Basses":brandId==="dionnesBoutique"?"Dionne’s Boutique":brandId}</h3></div><small>{snapshot.state?.reconciliation_status||"NOT_STARTED"} · cutover {snapshot.state?.cutover_ready?"ready":"locked"}</small></div>
   {!products.length?<p className="muted">No shadow inventory imported yet. The control plane is ready for the catalog migration.</p>:
   <div className="inventoryTable">{products.map((p:any)=><article className="inventoryRow" key={p.product_id}>
    <div className="inventoryProduct">{p.image_url&&<img src={p.image_url} alt=""/>}<div><small>{p.category||"PRODUCT"} · {p.manufacturer||""}</small><strong>{p.product_name}</strong><span>{p.variant_name||"Standard"} · {p.condition_status}</span></div></div>
    <div><small>PRICE</small><strong>{"$"+(Number(p.price_cents||0)/100).toFixed(2)}</strong></div>
    <div><small>ON HAND</small><strong>{Number(p.on_hand||0)}</strong><span>{Number(p.available||0)} available</span></div>
    <div className="inventoryActions"><button type="button" onClick={()=>void openGallery(p.product_id)}>Gallery</button><label style={{display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer"}}> {editingPhoto===p.product_id?"Updating photo…":"Replace photo"}<input aria-label={"Replace photo for "+p.product_name} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{maxWidth:150}} disabled={Boolean(editingPhoto)} onChange={e=>{const file=e.target.files?.[0];if(file)void replacePhoto(p.product_id,file)}}/></label><button disabled={busy===p.product_id} onClick={()=>adjust(p.product_id,1,"RECEIPT")}>＋ Receive</button><button disabled={busy===p.product_id||Number(p.on_hand||0)<=0} onClick={()=>adjust(p.product_id,-1,"ADJUSTMENT")}>− Adjust</button></div>
   </article>)}</div>}
  </section>
  {galleryProduct&&<section className="adminPanel"><div className="equipmentHead"><h3>Product Photo Gallery</h3><button type="button" onClick={()=>setGalleryProduct("")}>Close</button></div><div style={{display:"flex",flexWrap:"wrap",gap:12}}>{galleryPhotos.map((photo:any)=><figure key={photo.id} style={{margin:0}}><img src={photo.image_url} alt={photo.alt_text||"Instrument gallery photo"} style={{width:160,height:160,objectFit:"contain"}}/><figcaption>{photo.is_primary?"Primary":"Gallery"}</figcaption></figure>)}</div><label>Add gallery photo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={Boolean(editingPhoto)} onChange={e=>{const f=e.target.files?.[0];if(f)void addGalleryPhoto(galleryProduct,f)}}/></label></section>}
  <section className="principle"><strong>Cutover rule:</strong> no storefront authority until catalog, quantities, pricing and image references are reconciled and explicitly approved.</section>
 </section>;
}

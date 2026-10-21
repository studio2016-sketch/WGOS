"use client";
import {useState} from "react";
type Item={sku:string;name:string;description:string;kind:"PRODUCT"|"SERVICE";category:string;image:string;qty:string;cost:string;retail:string;sale:string;};
const blank:Item={sku:"",name:"",description:"",kind:"PRODUCT",category:"",image:"",qty:"",cost:"",retail:"",sale:""};
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
export default function CatalogDraftEditor({brandName,brandId}:{brandName:string;brandId:string}){
 const [item,setItem]=useState<Item>(blank);
 const [drafts,setDrafts]=useState<Item[]>([]);
 const [saving,setSaving]=useState(false),[saveResult,setSaveResult]=useState("");
 async function saveToWgos(){
  setSaving(true);setSaveResult("");
  try{const response=await fetch("/api/admin/catalog",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...item,brandId})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not save");
   setSaveResult("Private draft saved in WGOS.");setItem(blank);
  }catch(e){setSaveResult("Unable to save: "+(e instanceof Error?e.message:"Unknown error"));}
  finally{setSaving(false);}
 }

 const update=(key:keyof Item,value:string)=>setItem(p=>({...p,[key]:value}));
 const selling=Number(item.sale||item.retail||0),cost=Number(item.cost||0);
 const margin=selling>0?(selling-cost)/selling*100:null;
 function add(){
  if(!item.sku.trim()||!item.name.trim())return alert("Name and SKU are required.");
  if(drafts.some(x=>x.sku.toLowerCase()===item.sku.trim().toLowerCase()))return alert("SKU already exists in this draft.");
  if([item.cost,item.retail,item.sale].some(x=>x!==""&&(!Number.isFinite(Number(x))||Number(x)<0)))return alert("Prices must be nonnegative numbers.");
  if(item.sale!==""&&Number(item.sale)>Number(item.retail))return alert("Sale price cannot exceed retail.");
  if(item.kind==="PRODUCT"&&(!Number.isInteger(Number(item.qty))||Number(item.qty)<0))return alert("Quantity must be a nonnegative whole number.");
  setDrafts(v=>[...v,item]);setItem(blank);
 }
 function exportCsv(){
  const headers=["kind","sku","name","description","category","image","qty","cost","retail","sale"];
  const lines=[headers.join(","),...drafts.map(row=>headers.map(k=>'"'+String(row[k as keyof Item]??"").replaceAll('"','""')+'"').join(","))];
  const url=URL.createObjectURL(new Blob([lines.join("\r\n")],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="catalog-drafts.csv";a.click();URL.revokeObjectURL(url);
 }
 const field=(label:string,key:keyof Item,type="text")=><label style={{display:"grid",gap:6}}>{label}<input aria-label={label} type={type} value={item[key]} onChange={e=>update(key,e.target.value)} style={{padding:12,borderRadius:10,border:"1px solid #c2c7d0"}}/></label>;
 return <section style={{maxWidth:1100,margin:"25px auto",padding:24,borderRadius:20,background:"white",color:"#17243b"}}>
 <p style={{letterSpacing:2}}>WGOS • COMMERCE</p><h1>Quick Add — {brandName}</h1>
 <p>Prepare product and service records in one place. Draft-only workspace: nothing is published or saved to the server yet.</p>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:18}}>
 <label>Type<select value={item.kind} onChange={e=>setItem(x=>({...x,kind:e.target.value as Item["kind"],qty:e.target.value==="SERVICE"?"":x.qty}))}><option value="PRODUCT">Physical product</option><option value="SERVICE">Service</option></select></label>
 {field("SKU","sku")}{field("Product or service name","name")}{field("Category","category")}
 {field("Image URL","image","url")}{item.kind==="PRODUCT"&&field("Quantity on hand","qty","number")}
 {field("Wholesale / direct unit cost ($)","cost","number")}{field("Regular retail price ($)","retail","number")}{field("Sale price ($, optional)","sale","number")}
 </div>
 <label style={{display:"grid",marginTop:18,gap:6}}>Description<textarea rows={4} value={item.description} onChange={e=>update("description",e.target.value)} /></label>
 <div style={{display:"flex",gap:16,alignItems:"center",marginTop:16,flexWrap:"wrap"}}>
 {item.image&&<img src={item.image} alt="Product preview" style={{width:130,height:130,objectFit:"contain"}}/>}
 <div><strong>Expected unit gross profit: {money(selling-cost)}</strong><p>Gross margin: {margin===null?"—":margin.toFixed(1)+"%"} · Excludes shipping, fees, and overhead.</p></div>
 </div>
 <button type="button" onClick={add} style={{padding:"14px 22px",borderRadius:12,background:"#233f6b",color:"white"}}>Add to draft list</button>
 <button type="button" disabled={saving||!item.sku||!item.name} onClick={saveToWgos} style={{marginLeft:10,padding:"14px 22px",borderRadius:12}}>Save private draft to WGOS</button><p role="status">{saveResult}</p>
 <h2>Prepared items ({drafts.length})</h2>
 {drafts.map((p,i)=><div key={p.sku} style={{padding:12,borderBottom:"1px solid #ddd"}}><strong>{p.name}</strong> · {p.sku} · {money(Number(p.sale||p.retail||0))} <button type="button" onClick={()=>setDrafts(v=>v.filter((_,j)=>j!==i))}>Remove</button></div>)}
 <button disabled={!drafts.length} type="button" onClick={exportCsv}>Export draft CSV</button>
 </section>;
}

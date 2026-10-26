"use client";
import {useState} from "react";
type Item={id:number;sku:string;brand:string;name:string;variant:string;stock:number;price:number};
export default function BoutiqueCatalog({initial}:{initial:Item[]}){
 const [rows,setRows]=useState(initial),[query,setQuery]=useState("");
 const shown=rows.filter(x=>[x.sku,x.brand,x.name,x.variant].join(" ").toLowerCase().includes(query.toLowerCase()));
 function edit(id:number,key:"stock"|"price",value:string){
  const n=Number(value);if(!Number.isFinite(n)||n<0||(key==="stock"&&!Number.isInteger(n)))return;
  setRows(old=>old.map(x=>x.id===id?{...x,[key]:n}:x));
 }
 function exportCsv(){const cols=["sku","brand","name","variant","stock","price"] as const;const csv=[cols.join(","),...rows.map(x=>cols.map(k=>'"'+String(x[k]).replace(/"/g,'""')+'"').join(","))].join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="dionnes-inventory-review.csv";a.click();URL.revokeObjectURL(url)}
 return <section style={{fontSize:18}}>
 <p style={{padding:16,border:"1px solid #caa46c"}}><strong>Inventory review only.</strong> Edits below are temporary in this session. Export the draft CSV to retain changes. They do not modify live stock, WGOS database or customer orders.</p>
 <div style={{display:"flex",gap:14,flexWrap:"wrap",margin:"20px 0"}}><input aria-label="Search inventory" placeholder="Search SKU, brand or product" value={query} onChange={e=>setQuery(e.target.value)} style={{fontSize:18,padding:12,minWidth:270}}/><button onClick={exportCsv} style={{fontSize:18,padding:12}}>Export edited inventory CSV</button></div>
 <p>{rows.length} catalog products · {rows.reduce((n,x)=>n+x.stock,0)} provisional units · ${rows.reduce((n,x)=>n+x.stock*x.price,0).toFixed(2)} provisional retail value</p>
 <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["SKU","Product","Variant","Quantity","Price"].map(h=><th key={h} style={{textAlign:"left",padding:12}}>{h}</th>)}</tr></thead><tbody>{shown.map(p=><tr key={p.id}><td style={{padding:12}}>{p.sku}</td><td style={{padding:12}}><b>{p.brand}</b><br/>{p.name}</td><td style={{padding:12}}>{p.variant}</td><td style={{padding:12}}><input aria-label={"Quantity "+p.sku} type="number" min="0" step="1" value={p.stock} onChange={e=>edit(p.id,"stock",e.target.value)} style={{fontSize:18,width:80,padding:8}}/></td><td style={{padding:12}}><input aria-label={"Price "+p.sku} type="number" min="0" step=".01" value={p.price} onChange={e=>edit(p.id,"price",e.target.value)} style={{fontSize:18,width:100,padding:8}}/></td></tr>)}</tbody></table></div>
 </section>
}

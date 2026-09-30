"use client";
import {useMemo,useState} from "react";
export default function BrandFilter({brands}:{brands:any[]}){
 const [brand,setBrand]=useState("ALL");
 const options=useMemo(()=>brands||[],[brands]);
 function change(value:string){setBrand(value);document.documentElement.dataset.brandFilter=value;window.dispatchEvent(new CustomEvent("wgos:brand-filter",{detail:value}));}
 return <label className="brandFilter">BRAND<select value={brand} onChange={e=>change(e.target.value)}><option value="ALL">All brands</option>{options.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>;
}
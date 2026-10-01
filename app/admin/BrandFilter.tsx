"use client";
import {useRouter,useSearchParams} from "next/navigation";
const initials=(name:string)=>name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
export default function BrandFilter({brands}:{brands:any[]}){
 const router=useRouter(),params=useSearchParams();const brand=params.get("brand")||"ALL";
 function change(value:string){const q=new URLSearchParams(params.toString());if(value==="ALL")q.delete("brand");else q.set("brand",value);q.delete("project");router.push(location.pathname+(q.toString()?"?"+q.toString():""));}
 return <div className="brandSwitcher" aria-label="Brand context"><button className={brand==="ALL"?"brandTile active":"brandTile"} onClick={()=>change("ALL")}><b>◎</b><span>Global<small>All Brands</small></span></button>{brands.map(b=><button key={b.id} className={brand===b.id?"brandTile active":"brandTile"} onClick={()=>change(b.id)}><b>{initials(b.name)}</b><span>{b.name}<small>{b.legal_name||"Business"}</small></span></button>)}</div>;
}
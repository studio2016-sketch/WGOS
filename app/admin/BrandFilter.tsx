"use client";
import {useRouter,useSearchParams} from "next/navigation";
export default function BrandFilter({brands}:{brands:any[]}){
 const router=useRouter(),params=useSearchParams();const brand=params.get("brand")||"ALL";
 function change(value:string){const q=new URLSearchParams(params.toString());if(value==="ALL")q.delete("brand");else q.set("brand",value);q.delete("project");router.push(location.pathname+(q.toString()?"?"+q.toString():""));}
 return <label className="efficientBrandSwitcher"><span>Business</span><select aria-label="Business" value={brand} onChange={event=>change(event.target.value)}><option value="ALL">All my businesses</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>;
}

"use client";
import {useRouter,useSearchParams} from "next/navigation";
export default function BusinessSwitcher({brands}:{brands:any[]}){
 const router=useRouter();const params=useSearchParams();const current=params.get("brand")||"";
 return <label style={{display:"flex",alignItems:"center",gap:10,fontSize:16}}>
 <span>Business</span>
 <select aria-label="Select business" value={current} onChange={e=>router.push(e.target.value?"/admin?brand="+encodeURIComponent(e.target.value):"/admin")} style={{fontSize:16,padding:"10px 12px",maxWidth:250}}>
 <option value="">All businesses</option>
 {brands.map((b:any)=><option key={String(b.id)} value={String(b.id)}>{String(b.name)}</option>)}
 </select>
 </label>;
}

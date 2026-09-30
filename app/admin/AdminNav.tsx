import Link from "next/link";
import BrandFilter from "./BrandFilter";
export default function AdminNav({active,brands=[]}:{active:"commercial"|"operations";brands?:any[]}){
 return <nav className="topNav" aria-label="WGOS workspace">
  <div className="wordmark">WGOS <small>Williams Global Operating System</small></div>
  <div className="navLinks"><Link className={active==="commercial"?"active":""} href="/admin">Commercial</Link><Link className={active==="operations"?"active":""} href="/admin/operations">Operations</Link></div>
  {brands.length>0&&<BrandFilter brands={brands}/>}
 </nav>;
}
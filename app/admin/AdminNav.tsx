import Link from "next/link";
import BrandFilter from "./BrandFilter";
export default function AdminNav({active,brands=[],brand}:{active:"commercial"|"operations";brands?:any[];brand?:string}){
 const q=brand?"?brand="+encodeURIComponent(brand):"";
 return <nav className="topNav" aria-label="WGOS workspace"><div className="wordmark">WGOS <small>Williams Global Operating System</small></div><div className="navLinks"><Link className={active==="commercial"?"active":""} href={"/admin"+q}>Commercial</Link><Link className={active==="operations"?"active":""} href={"/admin/operations"+q}>Operations</Link></div>{brands.length>0&&<BrandFilter brands={brands}/>}</nav>;
}
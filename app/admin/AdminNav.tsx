import Link from "next/link";
import BrandFilter from "./BrandFilter";

export default function AdminNav({active,brands=[],brand}:{active:"commercial"|"operations"|"communications"|"equipment";brands?:any[];brand?:string}){
 const q=brand?"?brand="+encodeURIComponent(brand):"";
 return <nav className="topNav" aria-label="WGOS workspace">
  <Link href={"/admin"+q} className="wordmark" aria-label="WGOS command center"><b>WGOS</b><small>COMMAND CENTER</small></Link>
  <div className="workspaceSwitch" aria-label="Workspace">
   <Link className={active==="commercial"?"active":""} href={"/admin"+q}><i>01</i><span>Commercial</span></Link>
   <Link className={active==="operations"?"active":""} href={"/admin/operations"+q}><i>02</i><span>Operations</span></Link>
   <Link className={active==="communications"?"active":""} href={"/admin/communications"+q}><i>03</i><span>Comms</span></Link>
   <Link className={active==="equipment"?"active":""} href={"/admin/equipment"+q}><i>04</i><span>Resources</span></Link>
  </div>
  <div className="navContext">{brands.length>0&&<BrandFilter brands={brands}/>}</div>
 </nav>;
}
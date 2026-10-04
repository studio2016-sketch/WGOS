import Link from "next/link";
import BrandFilter from "./BrandFilter";
import GlobalSearch from "./GlobalSearch";

export default function AdminNav({active,brands=[],brand}:{active:"commercial"|"operations"|"communications"|"equipment"|"calendar"|"marketing"|"purpose";brands?:any[];brand?:string}){
 const q=brand?"?brand="+encodeURIComponent(brand):"";
 const nav=[
  {label:"Home",icon:"⌂",activeKey:"commercial",href:"/admin"+q},
  {label:"Commercial",icon:"◇",activeKey:"commercial",href:"/admin"+q+"#owner-detail-workspaces"},
  {label:"Operations",icon:"▣",activeKey:"operations",href:"/admin/operations"+q},
  {label:"Finance",icon:"▤",activeKey:"operations",href:"/admin/operations"+q+"#finance"},
  {label:"Contracts",icon:"▧",activeKey:"commercial",href:"/admin"+q+"#contracting"},
  {label:"Clients",icon:"♧",activeKey:"commercial",href:"/admin"+q+"#relationships"},
  {label:"Projects",icon:"◫",activeKey:"operations",href:"/admin/operations"+q},
  {label:"Comms",icon:"□",activeKey:"communications",href:"/admin/communications"+q},
  {label:"Schedule",icon:"◷",activeKey:"calendar",href:"/admin/calendar"+q},
  {label:"Resources",icon:"♢",activeKey:"equipment",href:"/admin/equipment"+q}
 ];
 return <><aside className="commandRail ownerRail" aria-label="WGOS primary navigation">
  <Link href={"/admin"+q} className="railMark ownerRailMark"><span>WGOS</span><i>⌁</i></Link>
  <div className="railNav ownerRailNav">{nav.map((item:any,i:number)=><Link key={item.label} className={(i===0&&active==="commercial")||active===item.activeKey&&item.label!=="Home"?"active":""} href={item.href}><b>{item.icon}</b><span>{item.label}</span></Link>)}</div>
  <div className="ownerRailSearch"><GlobalSearch brand={brand}/></div>
  <div className="railMotto ownerRailMotto"><span>PEOPLE<br/>MUSIC<br/>OPPORTUNITY<br/>A BRIGHTER<br/>TOMORROW</span></div>
  <div className="mobileNav">{nav.slice(0,5).map((item:any,i:number)=><Link key={item.label} className={(i===0&&active==="commercial")||active===item.activeKey&&item.label!=="Home"?"active":""} href={item.href}><b>{item.icon}</b><span>{item.label}</span></Link>)}</div>
 </aside>
 <nav className="topNav ownerTopNav" aria-label="WGOS workspace">
  <Link href={"/admin"+q} className="wordmark" aria-label="WGOS owner command"><b>WGOS</b><small>OWNER COMMAND</small></Link>
  <div className="ownerTopSearch"><GlobalSearch brand={brand}/></div>
  <Link className="newAction" href={"/admin#commercial-forms"}>＋ New</Link>
  <div className="workspaceSwitch">
   <Link className={active==="commercial"?"active":""} href={"/admin"+q}><i>01</i><span>Home</span></Link>
   <Link className={active==="operations"?"active":""} href={"/admin/operations"+q}><i>02</i><span>Operations</span></Link>
   <Link className={active==="communications"?"active":""} href={"/admin/communications"+q}><i>03</i><span>Comms</span></Link>
   <Link className={active==="calendar"?"active":""} href={"/admin/calendar"+q}><i>04</i><span>Schedule</span></Link>
   <Link className={active==="equipment"?"active":""} href={"/admin/equipment"+q}><i>05</i><span>Resources</span></Link>
   <Link className={active==="marketing"?"active":""} href={"/admin/marketing"+q}><i>06</i><span>Marketing</span></Link>
   <Link className={active==="purpose"?"active":""} href={"/admin/purpose"+q}><i>07</i><span>Purpose</span></Link>
  </div>
  <div className="navContext">{brands.length>0&&<BrandFilter brands={brands}/>}</div>
 </nav></>;
}

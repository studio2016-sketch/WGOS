import Link from "next/link";
import BrandFilter from "./BrandFilter";
import GlobalSearch from "./GlobalSearch";

type ActiveKey="home"|"clients"|"work"|"showprep"|"messages"|"calendar"|"people"|"money"|"marketing"|"resources"|"inventory";

export default function AdminNav({active,brands=[],brand}:{active:ActiveKey;brands?:any[];brand?:string}){
 const q=brand?"?brand="+encodeURIComponent(brand):"";
 const nav=[
  {label:"Home",icon:"⌂",key:"home",href:"/admin"+q},
  {label:"Clients",icon:"◇",key:"clients",href:"/admin"+q+"#relationships"},
  {label:"Work",icon:"▣",key:"work",href:"/admin/operations"+q},
  {label:"Show Prep",icon:"♫",key:"showprep",href:"/admin/show-prep"+q},
  {label:"Messages",icon:"□",key:"messages",href:"/admin/communications"+q},
  {label:"Calendar",icon:"◷",key:"calendar",href:"/admin/calendar"+q},
  {label:"People",icon:"♧",key:"people",href:"/admin/people"+q},
  {label:"Money",icon:"▤",key:"money",href:"/admin/operations"+q+"#finance"},
  {label:"Marketing",icon:"◎",key:"marketing",href:"/admin/marketing"+q},
  {label:"Inventory",icon:"▦",key:"inventory",href:"/admin/inventory"+q},
  {label:"Contracts",icon:"▧",key:"contracts",href:"/admin"+q+"#contracting"},
  {label:"Resources",icon:"♢",key:"resources",href:"/admin/equipment"+q}
 ];
 return <><aside className="commandRail ownerRail" aria-label="WGOS primary navigation">
  <Link href={"/admin"+q} className="railMark ownerRailMark"><span>WGOS</span><i>⌁</i></Link>
  <div className="railNav ownerRailNav">{nav.map((item:any)=><Link key={item.label} aria-current={active===item.key?"page":undefined} className={active===item.key?"active":""} href={item.href}><b>{item.icon}</b><span>{item.label}</span></Link>)}</div>

  <div className="railMotto ownerRailMotto"><span>PEOPLE<br/>MUSIC<br/>OPPORTUNITY<br/>A BRIGHTER<br/>TOMORROW</span></div>
  <div className="mobileNav">{nav.filter(item=>["home","work","messages","calendar"].includes(item.key)).map((item:any)=><Link key={item.label} aria-current={active===item.key?"page":undefined} className={active===item.key?"active":""} href={item.href}><b>{item.icon}</b><span>{item.label}</span></Link>)}<details className="mobileMore"><summary><b>☰</b><span>More</span></summary><nav aria-label="More workspaces">{nav.filter(item=>!["home","work","messages","calendar"].includes(item.key)).map(item=><Link key={item.key} href={item.href}>{item.label}</Link>)}</nav></details></div>
 </aside>
 <nav className="topNav ownerTopNav" aria-label="WGOS workspace">
  <Link href={"/admin"+q} className="wordmark" aria-label="WGOS owner command"><b>WGOS</b><small>OWNER COMMAND</small></Link>
  <div className="ownerTopSearch"><GlobalSearch brand={brand}/></div>
  <Link className="newAction" href={"/admin"+q+"#start-here"}>Quick actions</Link>
  <div className="navContext">{brands.length>0&&<BrandFilter brands={brands}/>}</div>
 </nav></>;
}

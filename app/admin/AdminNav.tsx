import Link from "next/link";
import BusinessSwitcher from "./BusinessSwitcher";
import {businessBranches} from "../../lib/business-branches";
import GlobalSearch from "./GlobalSearch";

type ActiveKey="home"|"clients"|"work"|"messages"|"calendar"|"people"|"money"|"marketing"|"resources";

export default function AdminNav({active,brands=[],brand}:{active:ActiveKey;brands?:any[];brand?:string}){
 const q=brand?"?brand="+encodeURIComponent(brand):"";
 const nav=[
  {label:"Home",icon:"⌂",key:"home",href:"/admin"+q},
  {label:"Clients",icon:"◇",key:"clients",href:"/admin"+q+"#owner-detail-workspaces"},
  {label:"Work",icon:"▣",key:"work",href:"/admin/operations"+q},
  {label:"Messages",icon:"□",key:"messages",href:"/admin/communications"+q},
  {label:"Calendar",icon:"◷",key:"calendar",href:"/admin/calendar"+q},
  {label:"People",icon:"♧",key:"people",href:"/admin/people"+q},
  {label:"Money",icon:"▤",key:"money",href:"/admin/operations"+q+"#finance"},
  {label:"Marketing",icon:"◎",key:"marketing",href:"/admin/marketing"+q},
  {label:"Resources",icon:"♢",key:"resources",href:"/admin/equipment"+q}
 ];
 const selected=brands.find((b:any)=>String(b.id)===String(brand));
 const focused=selected?[{label:"Home",icon:"⌂",key:"home",href:"/admin"+q},...businessBranches(String(selected.name)).map((b:any)=>({label:b.label,icon:"◇",key:"branch",href:b.path+q}))]:nav;
 const selectedHref="/admin"+q;
 return <><aside className="commandRail ownerRail" aria-label="WGOS primary navigation">
  <Link href={"/admin"+q} className="railMark ownerRailMark"><span>WGOS</span><i>⌁</i></Link>
  <div className="railNav ownerRailNav">{focused.map((item:any)=><Link key={item.label} className={active===item.key?"active":""} href={item.href}><b>{item.icon}</b><span>{item.label}</span></Link>)}</div>
  {selected&&<Link href="/admin" style={{display:"block",padding:"12px 18px",fontSize:14}}>← All businesses</Link>}
  <div className="ownerRailSearch"><GlobalSearch brand={brand}/></div>
  <div className="railMotto ownerRailMotto"><span>PEOPLE<br/>MUSIC<br/>OPPORTUNITY<br/>A BRIGHTER<br/>TOMORROW</span></div>
  <div className="mobileNav">{focused.slice(0,5).map((item:any)=><Link key={item.label} className={active===item.key?"active":""} href={item.href}><b>{item.icon}</b><span>{item.label}</span></Link>)}{selected&&<Link href="/admin" aria-label="Return to all businesses"><b>↩</b><span>All</span></Link>}</div>
 </aside>
 <nav className="topNav ownerTopNav" aria-label="WGOS workspace">
  <Link href={"/admin"+q} className="wordmark" aria-label="WGOS owner command"><b>WGOS</b><small>OWNER COMMAND</small></Link>
  <div className="ownerTopSearch"><GlobalSearch brand={brand}/></div>
  <Link className="newAction" href={"/admin"+q+"#start-here"}>＋ Do</Link>
  <div className="navContext">{brands.length>0&&<BusinessSwitcher brands={brands}/>}</div>
 </nav></>;
}

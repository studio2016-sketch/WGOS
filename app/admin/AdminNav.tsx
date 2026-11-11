import Link from 'next/link';
import BrandFilter from './BrandFilter';
import GlobalSearch from './GlobalSearch';
import WorkspaceIcon from './WorkspaceIcon';
import {studioPursuitBrand,contractPursuitHref,festivalBrand,festivalHref} from '../../lib/workspace-links';
type ActiveKey='home'|'clients'|'work'|'showprep'|'messages'|'calendar'|'people'|'money'|'marketing'|'resources'|'inventory'|'contracts'|'pursuits'|'festivals';
export default function AdminNav({active,brands=[],brand}:{active:ActiveKey;brands?:any[];brand?:string}){
 const q=brand?'?brand='+encodeURIComponent(brand):'';
 const studio=studioPursuitBrand(brands,brand);
 const artists=festivalBrand(brands,brand);
 const nav=[
 {label:'Overview',key:'home',href:'/admin'+q,group:'Workspace'},
 {label:'Messages',key:'messages',href:'/admin/communications'+q,group:'Workspace'},
 {label:'Calendar',key:'calendar',href:'/admin/calendar'+q,group:'Workspace'},
 {label:'Projects & work',key:'work',href:'/admin/operations'+q,group:'Workspace'},
 {label:'Clients',key:'clients',href:'/admin'+q+'#relationships',group:'Growth'},
 ...(studio?[{label:'Contract Pursuit',key:'pursuits',href:contractPursuitHref(studio.id),group:'Growth'}]:[]),
 ...(artists?[{label:'Festival bookings',key:'festivals',href:festivalHref(artists.id),group:'Growth'}]:[]),
 {label:'Marketing',key:'marketing',href:'/admin/marketing'+q,group:'Growth'},
 {label:'Contracts',key:'contracts',href:'/admin'+q+'#contracting',group:'Business'},
 {label:'Money',key:'money',href:'/admin/operations'+q+'#finance',group:'Business'},
 {label:'People',key:'people',href:'/admin/people'+q,group:'Business'},
 {label:'Inventory',key:'inventory',href:'/admin/inventory'+q,group:'Business'},
 {label:'Equipment',key:'resources',href:'/admin/equipment'+q,group:'Business'},
 {label:'Show Prep',key:'showprep',href:'/admin/show-prep'+q,group:'Business'}
 ];
 return <><a className="skipContent" href="#workspace-main">Skip to workspace</a><aside className="commandRail ownerRail" aria-label="WGOS primary navigation">
 <Link href={'/admin'+q} className="railMark ownerRailMark"><span>WGOS</span><small>WILLIAMS GLOBAL</small></Link>
 <nav className="railNav ownerRailNav">{['Workspace','Growth','Business'].map(group=><div className="railGroup" key={group}><p>{group}</p>{nav.filter(item=>item.group===group).map(item=><Link key={item.key} aria-current={active===item.key?'page':undefined} className={active===item.key?'active':''} href={item.href}><WorkspaceIcon name={item.key}/><span>{item.label}</span></Link>)}</div>)}</nav>
 <div className="railFoot"><span className="railAccount">JW</span><div>Williams Global<small>Private operating system</small></div></div>
 <div className="mobileNav">{nav.filter(item=>['home','work','messages','calendar'].includes(item.key)).map(item=><Link key={item.key} aria-current={active===item.key?'page':undefined} className={active===item.key?'active':''} href={item.href}><WorkspaceIcon name={item.key}/><span>{item.key==='work'?'Work':item.label}</span></Link>)}<details className="mobileMore"><summary><WorkspaceIcon name="more"/><span>More</span></summary><nav aria-label="More workspaces">{nav.filter(item=>!['home','work','messages','calendar'].includes(item.key)).map(item=><Link key={item.key} aria-current={active===item.key?'page':undefined} href={item.href}><WorkspaceIcon name={item.key} size={17}/>{item.label}</Link>)}</nav></details></div>
 </aside>
 <nav className="topNav ownerTopNav" aria-label="WGOS workspace"><Link href={'/admin'+q} className="wordmark"><b>Williams Global</b><small>Operating system</small></Link><div className="ownerTopSearch"><GlobalSearch brand={brand}/></div><div className="navContext">{active==='pursuits'&&studio?<span className="fixedBusinessContext"><WorkspaceIcon name="pursuits" size={16}/>{studio.name}</span>:brands.length>0&&<BrandFilter brands={brands}/>}</div><Link className="newAction" href={'/admin'+q+'#start-here'}>Workspaces <WorkspaceIcon name="arrow" size={14}/></Link></nav><span id="workspace-main" tabIndex={-1}/></>;
}

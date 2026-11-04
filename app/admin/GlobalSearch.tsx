"use client";
import {useEffect,useRef,useState} from "react";import {useRouter} from "next/navigation";
export default function GlobalSearch({brand}:{brand?:string}){const router=useRouter(),[q,setQ]=useState(""),[rows,setRows]=useState<any[]>([]),[open,setOpen]=useState(false),[active,setActive]=useState(0),[loading,setLoading]=useState(false),[failed,setFailed]=useState(false),input=useRef<HTMLInputElement>(null);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){if(!input.current?.checkVisibility()||input.current.closest(".workspaceSection"))return;e.preventDefault();input.current.focus();setOpen(true)}if(e.key==="Escape"){setOpen(false);input.current?.blur()}};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key)},[]);
 useEffect(()=>{
  setRows([]);setActive(0);setFailed(false);
  if(q.trim().length<2){setLoading(false);return}
  const controller=new AbortController();setLoading(true);
  const timer=setTimeout(async()=>{
   try{
    const r=await fetch("/api/admin/search?q="+encodeURIComponent(q)+(brand?"&brand="+encodeURIComponent(brand):""),{signal:controller.signal});
    if(!r.ok)throw new Error("SEARCH_UNAVAILABLE");
    const data=await r.json();if(controller.signal.aborted)return;
    setRows((data.results||[]).slice(0,10));setActive(0);
   }catch{if(!controller.signal.aborted)setFailed(true)}finally{if(!controller.signal.aborted)setLoading(false)}
  },180);
  return()=>{clearTimeout(timer);controller.abort()};
 },[q,brand]);

 function go(x:any){setOpen(false);setQ("");const b=brand?"?brand="+encodeURIComponent(brand):"";const amp=brand?"&brand="+encodeURIComponent(brand):"";switch(x.kind){case "PROJECT":router.push("/admin/operations?project="+encodeURIComponent(x.id)+amp);break;case "TASK":router.push("/admin/operations?project="+encodeURIComponent(x.parent_id)+"&task="+encodeURIComponent(x.id)+(brand?"&brand="+encodeURIComponent(brand):""));break;case "ASSET":router.push("/admin/equipment?asset="+encodeURIComponent(x.id)+(brand?"&brand="+encodeURIComponent(brand):""));break;case "PROPOSAL":router.push("/admin?proposal="+encodeURIComponent(x.id)+(brand?"&brand="+encodeURIComponent(brand):"")+"#commercial-lifecycle");break;case "CONTACT":router.push("/admin?contact="+encodeURIComponent(x.id)+(brand?"&brand="+encodeURIComponent(brand):"")+"#relationships");break;case "ORGANIZATION":router.push("/admin?organization="+encodeURIComponent(x.id)+(brand?"&brand="+encodeURIComponent(brand):"")+"#relationships");break;case "OPPORTUNITY":router.push("/admin?opportunity="+encodeURIComponent(x.id)+(brand?"&brand="+encodeURIComponent(brand):"")+"#commercial");break;default:router.push("/admin"+b+"#commercial");}}
 function keys(e:any){if(!open)return;if(e.key==="ArrowDown"){e.preventDefault();setActive(Math.max(0,Math.min(active+1,rows.length-1)))}if(e.key==="ArrowUp"){e.preventDefault();setActive(Math.max(active-1,0))}if(e.key==="Enter"&&rows[active]){e.preventDefault();go(rows[active])}}
 return <div className="globalCommand"><span>⌕</span><input ref={input} aria-label="Search WGOS" placeholder="Search clients, projects, proposals, tasks, assets…" value={q} onKeyDown={keys} onFocus={()=>q.length>1&&setOpen(true)} onChange={e=>{setQ(e.target.value);setOpen(true)}}/><kbd>⌘ K</kbd>{open&&<div className="searchResults">{rows.length?rows.map((x,i)=><button key={x.kind+x.id} className={i===active?"selected":""} onMouseEnter={()=>setActive(i)} onClick={()=>go(x)}><i className={"resultKind kind"+x.kind}>{x.kind}</i><strong>{x.title}</strong><small>{x.subtitle||"WGOS record"}</small><em className="resultOpen">↗</em></button>):loading?<p role="status">Searching…</p>:failed?<p role="status">Search is unavailable. Try again.</p>:q.length>1?<p>No matching records.</p>:<p>Type to search WGOS.</p>}</div>}</div>}
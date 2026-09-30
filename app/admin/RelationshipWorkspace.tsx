"use client";
import {useEffect,useMemo,useState} from "react";
export default function RelationshipWorkspace({organizations,contacts,brands}:{organizations:any[];contacts:any[];brands:any[]}){
 const [filter,setFilter]=useState("ALL");const [q,setQ]=useState("");
 useEffect(()=>{const h=(e:any)=>setFilter(e.detail||"ALL");window.addEventListener("wgos:brand-filter",h);return()=>window.removeEventListener("wgos:brand-filter",h)},[]);
 const brandName=(id:string)=>brands.find(b=>b.id===id)?.name||id;
 const match=(x:any)=>filter==="ALL"||(x.brand_ids||[]).includes(filter);
 const orgs=useMemo(()=>organizations.filter(match).filter(o=>(o.name+" "+(o.type||"")).toLowerCase().includes(q.toLowerCase())),[organizations,filter,q]);
 const people=useMemo(()=>contacts.filter(match).filter(c=>(c.first_name+" "+c.last_name+" "+(c.email||"")+" "+(c.organization_name||"")).toLowerCase().includes(q.toLowerCase())),[contacts,filter,q]);
 return <section className="adminPanel relationshipWorkspace">
  <div className="workspaceTitle"><div><p className="eyebrow">RELATIONSHIPS</p><h2>CRM</h2><p className="muted">People and organizations remain global records while their brand relationships stay explicit.</p></div><input aria-label="Search relationships" placeholder="Search people or organizations…" value={q} onChange={e=>setQ(e.target.value)}/></div>
  <div className="relationshipGrid">
   <div><div className="subhead"><strong>Contacts</strong><span>{people.length}</span></div>{people.length===0?<p className="muted">No contacts match this view.</p>:people.map(c=><article className="recordCard" key={c.id}><div className="recordAvatar">{String(c.first_name||"?")[0]}{String(c.last_name||"?")[0]}</div><div><strong>{c.first_name} {c.last_name}</strong><p>{c.role||"Contact"}{c.organization_name?" · "+c.organization_name:""}</p><small>{c.email||c.phone||"No contact method yet"}</small></div><div className="brandChips">{(c.brand_ids||[]).map((id:string)=><span key={id}>{brandName(id)}</span>)}</div></article>)}</div>
   <div><div className="subhead"><strong>Organizations</strong><span>{orgs.length}</span></div>{orgs.length===0?<p className="muted">No organizations match this view.</p>:orgs.map(o=><article className="recordCard" key={o.id}><div className="recordAvatar org">ORG</div><div><strong>{o.name}</strong><p>{o.type||"Organization"}</p><small>{o.website||"No website yet"}</small></div><div className="brandChips">{(o.brand_ids||[]).map((id:string)=><span key={id}>{brandName(id)}</span>)}</div></article>)}</div>
  </div>
 </section>;
}
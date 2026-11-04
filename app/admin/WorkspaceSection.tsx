"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {usePathname,useSearchParams} from "next/navigation";

export default function WorkspaceSection({id,title,description,children,initialOpen=false}:{id:string;title:string;description:string;children:ReactNode;initialOpen?:boolean}){
 const ref=useRef<HTMLDetailsElement>(null);
 const [open,setOpen]=useState(initialOpen);
 const pathname=usePathname(),params=useSearchParams();
 useEffect(()=>{
  function reveal(hash=location.hash){
   let key:string;try{key=decodeURIComponent(hash.slice(1))}catch{return}
   const target=key?document.getElementById(key):null;
   if(target&&ref.current?.contains(target)){
    setOpen(true);
    ref.current.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({block:"start"}));
   }
  }
  reveal();
  const hashchange=()=>reveal();
  const click=(event:MouseEvent)=>{
   const anchor=(event.target as Element)?.closest?.("a[href]");
   if(!anchor||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const url=new URL(anchor.getAttribute("href")||"",location.href);
   // Read the clicked destination before Next.js replaces the current hash.
   if(url.origin===location.origin&&url.pathname===pathname&&url.hash)reveal(url.hash);
  };
  window.addEventListener("hashchange",hashchange);document.addEventListener("click",click);
  return()=>{window.removeEventListener("hashchange",hashchange);document.removeEventListener("click",click)};
 },[pathname,params]);
 return <details ref={ref} id={id} className="workspaceSection" open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary><span><strong>{title}</strong><small>{description}</small></span><b aria-hidden="true">＋</b></summary><div className="workspaceSectionBody">{children}</div></details>;
}

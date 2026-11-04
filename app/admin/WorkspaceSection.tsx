"use client";
import {useEffect,useRef,type ReactNode} from "react";

// Preserve record links when their workspace is collapsed, including client navigation.
export default function WorkspaceSection({id,title,description,children,initialOpen=false}:{id:string;title:string;description:string;children:ReactNode;initialOpen?:boolean}){
 const ref=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  function reveal(){
   let hash:string;try{hash=decodeURIComponent(location.hash.slice(1))}catch{return}
   const target=hash?document.getElementById(hash):null;
   if(target&&ref.current?.contains(target)){
    ref.current.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({block:"start"}));
   }
  }
  reveal();window.addEventListener("hashchange",reveal);
  // Next.js may update same-page hashes with pushState, without a hashchange event.
  const click=(event:MouseEvent)=>{const anchor=(event.target as Element)?.closest?.("a[href]");if(anchor)requestAnimationFrame(reveal)};
  document.addEventListener("click",click);
  return()=>{window.removeEventListener("hashchange",reveal);document.removeEventListener("click",click)};
 },[]);
 return <details ref={ref} id={id} className="workspaceSection" open={initialOpen||undefined}><summary><span><strong>{title}</strong><small>{description}</small></span><b aria-hidden="true">＋</b></summary><div className="workspaceSectionBody">{children}</div></details>;
}

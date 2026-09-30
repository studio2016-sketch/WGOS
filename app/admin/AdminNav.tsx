import Link from "next/link";
export default function AdminNav({active}:{active:"commercial"|"operations"}){
 return <nav className="topNav" aria-label="WGOS workspace">
  <Link className={active==="commercial"?"active":""} href="/admin">Commercial</Link>
  <Link className={active==="operations"?"active":""} href="/admin/operations">Operations</Link>
 </nav>;
}
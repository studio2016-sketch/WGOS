import Link from "next/link";
import {commandAccess,canAccessBrand} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {businessBranches} from "../../../../lib/business-branches";
import {notFound,redirect} from "next/navigation";
const destinations:{[key:string]:string}={
 clients:"/admin?brand=",bookings:"/admin?brand=",finances:"/admin/operations?brand=",
 projects:"/admin/operations?brand=",approvals:"/admin?brand=",contracts:"/admin?brand="
};
export default async function BranchPage({params,searchParams}:{params:Promise<{subject:string}>,searchParams:Promise<{brand?:string}>}){
 const {subject}=await params;const {brand}=await searchParams;
 if(!destinations[subject])notFound();
 if(!brand||!/^[0-9a-f-]{36}$/i.test(brand))redirect("/admin");
 const access=await commandAccess();
 if(!await canAccessBrand(access.identity,brand))redirect("/admin");
 const sql=db();const found=await sql`select name from wgos.brands where id=${brand}::uuid limit 1`;
 if(!found.length)notFound();
 const name=String(found[0].name);
 const entry=businessBranches(name).find(x=>x.path==="/admin/branch/"+subject);
 if(!entry)notFound();
 return <main className="admin" style={{maxWidth:900,margin:"auto",padding:32,fontSize:18}}>
 <Link href={"/admin?brand="+encodeURIComponent(brand)}>← {name}</Link>
 <p className="eyebrow" style={{marginTop:32}}>{name.toUpperCase()}</p>
 <h1 style={{fontSize:"clamp(32px,5vw,52px)"}}>{entry.label}</h1>
 <p>{entry.description}</p>
 <section className="adminPanel" style={{padding:24,marginTop:24}}>
 <h2>Focused workspace</h2>
 <p>This branch is being separated from the legacy combined management screen. Its dedicated records and actions are not yet migrated.</p>
 <p>Until migration is verified, existing tools remain accessible without changing business data.</p>
 <Link href={destinations[subject]+encodeURIComponent(brand)}>Open existing tools →</Link>
 </section>
 </main>;
}

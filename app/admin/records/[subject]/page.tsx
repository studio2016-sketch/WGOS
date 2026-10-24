import Link from "next/link";
import {commandAccess,canAccessBrand} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {businessBranches} from "../../../../lib/business-branches";
import {commercialLifecycleRecords} from "../../../../lib/commercial-lifecycle";
import {notFound,redirect} from "next/navigation";
export default async function BranchRecords({params,searchParams}:{params:Promise<{subject:string}>,searchParams:Promise<{brand?:string}>}){
 const {subject}=await params;const {brand}=await searchParams;
 if(!["projects","contracts","finances"].includes(subject))notFound();
 if(!brand||!/^[0-9a-f-]{36}$/i.test(brand))redirect("/admin");
 const access=await commandAccess();
 if(!await canAccessBrand(access.identity,brand))redirect("/admin");
 const sql=db();const brands=await sql`select name from wgos.brands where id=${brand}::uuid limit 1`;
 if(!brands.length)notFound();
 const name=String(brands[0].name);
 const branch=businessBranches(name).find(x=>x.path==="/admin/branch/"+subject);
 if(!branch)notFound();
 const lifecycle=await commercialLifecycleRecords();
 const source=subject==="projects"?lifecycle.projects:subject==="contracts"?lifecycle.agreements:lifecycle.payments;
 const rows=source.filter((x:any)=>String(x.brand_id)===brand);
 return <main className="admin" style={{maxWidth:920,margin:"auto",padding:32,fontSize:18}}>
 <Link href={"/admin?brand="+encodeURIComponent(brand)}>← {name}</Link>
 <p className="eyebrow" style={{marginTop:30}}>{name.toUpperCase()}</p>
 <h1 style={{fontSize:"clamp(32px,5vw,52px)"}}>{branch.label}</h1>
 <p>{branch.description}</p>
 <section className="adminPanel" style={{padding:24,marginTop:24}}>
 <h2>{rows.length} records</h2>
 {subject==="finances"&&<p>These are payment records, not reconciled cash balances or certified profit.</p>}
 <div style={{display:"grid",gap:12}}>
 {rows.map((row:any)=><article key={String(row.id)} style={{border:"1px solid #7775",borderRadius:12,padding:18}}>
 <strong>{String(row.title||row.opportunity_title||row.brand_name||"Record")}</strong>
 <p>Status: {String(row.status||"Unknown")}</p>
 {subject==="finances"&&<p>Recorded amount: {String(row.currency||"USD")} {Number(row.amount||0).toFixed(2)}</p>}
 </article>)}
 </div>
 {!rows.length&&<p>No records are currently available for this business.</p>}
 </section></main>;
}

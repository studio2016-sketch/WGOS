import Link from "next/link";
import {commandAccess,canAccessBrand} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {notFound,redirect} from "next/navigation";
const sections:{[key:string]:[string,string]}={
 sales:["Sales","Actual sales will appear after verified checkout and payment integration. No sales figures are currently connected."],
 orders:["Orders","Order fulfillment and customer purchases will appear after checkout integration. No live orders are connected."],
 customers:["Customers","Customer records require verified business-scoped integration. Existing communications remain accessible separately."],
 finances:["Finances","Actual revenue, fees, expenses and profit require accounting integration. Catalog retail value is not profit."]
};
export default async function Subject({params,searchParams}:{params:Promise<{subject:string}>,searchParams:Promise<{brand?:string}>}){
 const {subject}=await params,{brand}=await searchParams;
 if(!sections[subject])notFound();
 if(!brand||!/^[0-9a-f-]{36}$/i.test(brand))redirect("/admin");
 const access=await commandAccess();
 if(!await canAccessBrand(access.identity,brand))redirect("/admin");
 const sql=db();
 const rows=await sql`select name from wgos.brands where id=${brand}::uuid limit 1`;
 if(!rows.length||!/dionne/i.test(String(rows[0].name)))redirect("/admin");
 const [title,description]=sections[subject];
 return <main className="admin" style={{maxWidth:900,margin:"auto",padding:32,fontSize:18}}>
 <Link href={"/admin?brand="+encodeURIComponent(brand)}>← Dionne’s Boutique</Link>
 <p className="eyebrow" style={{marginTop:32}}>DIONNE’S BOUTIQUE</p>
 <h1 style={{fontSize:"clamp(32px,5vw,52px)"}}>{title}</h1>
 <section className="adminPanel" style={{padding:24}}><p>{description}</p></section>
 </main>;
}

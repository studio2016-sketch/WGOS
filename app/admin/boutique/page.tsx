import Link from "next/link";
import {commandAccess,canAccessBrand} from "../../../lib/authz";
import {db} from "../../../lib/db";
import BoutiqueCatalog from "./BoutiqueCatalog";
import snapshot from "./catalog-snapshot.json";
import {redirect} from "next/navigation";
export default async function BoutiquePage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const access=await commandAccess();const {brand}=await searchParams;
 if(!brand)redirect("/admin");
 if(!await canAccessBrand(access.identity,brand))redirect("/admin");
 const sql=db();const rows=await sql`select name from wgos.brands where id=${brand}::uuid limit 1`;
 if(!rows.length||!/dionne/i.test(String(rows[0].name)))redirect("/admin");
 return <main className="admin" style={{maxWidth:1280,margin:"auto",padding:"30px 22px"}}>
 <Link href={"/admin?brand="+encodeURIComponent(brand)}>← Dionne’s Boutique command</Link>
 <header style={{margin:"30px 0"}}><p className="eyebrow">DIONNE’S BOUTIQUE · WGOS</p><h1>Inventory & Products</h1><p>Review product records, adjust draft quantities and prices, and export proposed changes for reconciliation.</p></header>
 <BoutiqueCatalog initial={snapshot}/>

 </main>;
}

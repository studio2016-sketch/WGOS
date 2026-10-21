import {commandAccess} from "../../../lib/authz";
import {getOperationsReferenceData} from "../../../lib/operations-board";
import CatalogDraftEditor from "./CatalogDraftEditor";
import Link from "next/link";
export default async function CatalogPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const access=await commandAccess();
 const params=await searchParams;
 let brands:any[]=[];
 try{const refs=await getOperationsReferenceData(access.identity.auth_user_id,access.isGlobal);brands=refs.brands||[];}catch{}
 const brand=brands.find(b=>b.id===params.brand)||brands[0];
 return <main style={{background:"#f2f4f8",minHeight:"100vh",padding:18}}>
 <p><Link href="/admin">← WGOS Command Center</Link></p>
 {!brand?<p>No authorized business catalog is currently available, or the database is unavailable.</p>:<>
 <nav aria-label="Choose a business">{brands.map(b=><Link key={b.id} href={"/admin/catalog?brand="+encodeURIComponent(b.id)} style={{display:"inline-block",padding:10,margin:5}}>{b.name}</Link>)}</nav>
 <CatalogDraftEditor key={brand.id} brandId={brand.id} brandName={brand.name}/>
 </>}
 </main>;
}

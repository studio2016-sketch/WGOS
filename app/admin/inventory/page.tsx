import Link from "next/link";
import AdminNav from "../AdminNav";
import InventoryWorkspace from "../InventoryWorkspace";
import {commandAccess} from "../../../lib/authz";
import {relationshipReferenceData} from "../../../lib/relationships";
import {inventorySnapshot} from "../../../lib/inventory";

export default async function InventoryPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const query=await searchParams;const access=await commandAccess();const refs:any=await relationshipReferenceData();
 const allowed=new Set(access.isGlobal?refs.brands.map((b:any)=>b.id):(access.brandIds||[]));
 const brands=refs.brands.filter((b:any)=>allowed.has(b.id));
 const requested=String(query.brand||"");
 const brandId=requested?(allowed.has(requested)?requested:""):(allowed.has("dionnesBoutique")?"dionnesBoutique":brands[0]?.id||"");
 if(!brandId)return <main className="admin"><AdminNav active="inventory" brands={brands}/><section className="adminPanel"><h1>Choose an accessible business</h1><p className="muted">This login cannot open the requested business. Select one of your businesses below. The master owner login has access to every business.</p><div className="adminActions">{brands.map((b:any)=><Link key={b.id} href={"/admin/inventory?brand="+encodeURIComponent(b.id)}>{b.name}</Link>)}</div></section></main>;
 let loadFailed=false;let snapshot:any={state:null,products:[],locations:[],batches:[]};try{snapshot=await inventorySnapshot(brandId)}catch{loadFailed=true}
 return <main className="admin"><AdminNav active="inventory" brands={refs.brands.filter((b:any)=>allowed.has(b.id))} brand={brandId}/><header className="adminHead commandHero"><div><p className="eyebrow">WGOS · RETAIL OPERATIONS</p><h1>Inventory Command</h1><p>Private catalog, quantity, valuation and reconciliation controls before WGOS becomes the source of truth.</p></div></header>{loadFailed?<section className="adminPanel" role="status"><h2>Inventory could not be loaded</h2><p>Please refresh to try again. No inventory has been changed.</p></section>:<InventoryWorkspace brandId={brandId} snapshot={snapshot}/>}</main>;
}

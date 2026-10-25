import AdminNav from "../AdminNav";
import InventoryWorkspace from "../InventoryWorkspace";
import {commandAccess} from "../../../lib/authz";
import {relationshipReferenceData} from "../../../lib/relationships";
import {inventorySnapshot} from "../../../lib/inventory";

export default async function InventoryPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const query=await searchParams;const access=await commandAccess();const refs:any=await relationshipReferenceData();
 const allowed=new Set(access.isGlobal?refs.brands.map((b:any)=>b.id):(access.brandIds||[]));
 const requested=String(query.brand||"dionnesBoutique");const brandId=allowed.has(requested)?requested:(allowed.has("dionnesBoutique")?"dionnesBoutique":"");
 if(!brandId)return <main className="admin"><AdminNav active="resources" brands={refs.brands}/><section className="adminPanel"><h1>Inventory unavailable</h1><p className="muted">Your account does not have access to this brand.</p></section></main>;
 let snapshot:any={state:null,products:[],locations:[],batches:[]};let inventoryError=false;try{snapshot=await inventorySnapshot(brandId)}catch{inventoryError=true;}
 return <main className="admin"><AdminNav active="resources" brands={refs.brands.filter((b:any)=>allowed.has(b.id))} brand={brandId}/><header className="adminHead commandHero"><div><p className="eyebrow">WGOS · RETAIL OPERATIONS</p><h1>Inventory Command</h1><p>Private catalog, quantity, valuation and reconciliation controls before WGOS becomes the source of truth.</p></div></header>{inventoryError?<section className="adminPanel" role="alert"><h2>Inventory setup incomplete</h2><p>The inventory database is not available in this environment. Product counts and quantities cannot be verified yet. No storefront changes have been made.</p><p className="muted">Inventory entry is temporarily disabled until the database schema and access controls pass verification.</p></section>:<InventoryWorkspace brandId={brandId} snapshot={snapshot}/>}</main>;
}

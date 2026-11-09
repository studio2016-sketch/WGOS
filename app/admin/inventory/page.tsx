import BoutiqueSettings from "../BoutiqueSettings";
import {boutiqueSettings,boutiqueTaxStatus} from "../../../lib/boutique-settings";
import Link from "next/link";
import AdminNav from "../AdminNav";
import InventoryWorkspace from "../InventoryWorkspace";
import {commandAccess,canManageBrand} from "../../../lib/authz";
import {relationshipReferenceData} from "../../../lib/relationships";
import {paidOrderQueue,orderQueueOptions,orderFilters} from "../../../lib/retail-orders";
import {inventorySnapshot} from "../../../lib/inventory";

export default async function InventoryPage({searchParams}:{searchParams:Promise<{brand?:string;orders?:string;orderPage?:string}>}){
 const query=await searchParams;const access=await commandAccess();const refs:any=await relationshipReferenceData();
 const allowed=new Set(access.isGlobal?refs.brands.map((b:any)=>b.id):(access.brandIds||[]));
 const brands=refs.brands.filter((b:any)=>allowed.has(b.id));
 const requested=String(query.brand||"");
 const brandId=requested?(allowed.has(requested)?requested:""):(allowed.has("dionnesBoutique")?"dionnesBoutique":brands[0]?.id||"");
 if(!brandId)return <main className="admin"><AdminNav active="inventory" brands={brands}/><section className="adminPanel"><h1>Choose an accessible business</h1><p className="muted">This login cannot open the requested business. Select one of your businesses below. The master owner login has access to every business.</p><div className="adminActions">{brands.map((b:any)=><Link key={b.id} href={"/admin/inventory?brand="+encodeURIComponent(b.id)}>{b.name}</Link>)}</div></section></main>;
 let loadFailed=false;let snapshot:any={state:null,products:[],locations:[],batches:[]};try{snapshot=await inventorySnapshot(brandId)}catch{loadFailed=true}
 const canManage=await canManageBrand(access.identity,brandId);
 let commerce:any=null,taxStatus:any=null;
 if(brandId==="dionnesBoutique"&&canManage){
  const loaded=await Promise.allSettled([boutiqueSettings(),boutiqueTaxStatus()]);
  if(loaded[0].status==="fulfilled")commerce=loaded[0].value;
  if(loaded[1].status==="fulfilled")taxStatus=loaded[1].value;
 }
 let orders:any[]=[];let ordersUnavailable=false;let hasNext=false;
 const {filter,page}=orderQueueOptions(query);
 const orderHref=(status:string,number=1)=>"/admin/inventory?"+new URLSearchParams({brand:brandId,orders:status,orderPage:String(number)}).toString();
 if(canManage){
  try{const result=await paidOrderQueue(brandId,query);orders=result.orders;hasNext=result.hasNext;}catch{ordersUnavailable=true;}
 }
 return <main className="admin"><AdminNav active="inventory" brands={refs.brands.filter((b:any)=>allowed.has(b.id))} brand={brandId}/><header className="adminHead commandHero"><div><p className="eyebrow">WGOS · RETAIL OPERATIONS</p><h1>Inventory Command</h1><p>Private catalog, quantity, valuation and reconciliation controls before WGOS becomes the source of truth.</p></div></header>{loadFailed?<section className="adminPanel" role="status"><h2>Inventory could not be loaded</h2><p>Please refresh to try again. No inventory has been changed.</p></section>:<><div>{commerce&&<BoutiqueSettings saved={commerce} taxStatus={taxStatus}/>}</div><InventoryWorkspace key={brandId} brandId={brandId} brandName={brands.find((b:any)=>b.id===brandId)?.name||"Selected business"} snapshot={snapshot} canManage={canManage}/></>}
 {canManage&&<section className="adminPanel"><h2>Paid orders</h2><nav className="adminActions" aria-label="Filter paid orders">{orderFilters.map(status=><Link key={status} href={orderHref(status)} aria-current={filter===status?"page":undefined}>{status==="ALL"?"All orders":status==="REVIEW"?"Review needed":status==="READY"?"Ready to fulfill":"Shipped"}</Link>)}</nav>{ordersUnavailable?<p role="status">Orders could not be loaded. Please refresh.</p>:orders.length?orders.map(order=><article className="principle" key={order.id}><strong>{order.fulfillment_status==="REVIEW"?"Review needed":order.fulfillment_status==="READY"?"Ready to fulfill":"Shipped"} · {order.currency.toUpperCase()} {(Number(order.amount_total)/100).toFixed(2)}</strong><p>{order.customer_email||"Customer email unavailable"} · {new Date(order.created_at).toLocaleString()}</p>{order.review_reason&&<p>{order.review_reason}</p>}<details><summary>Order details</summary><ul>{(order.items||[]).map((item:any)=><li key={item.sourceId}>{item.quantity} × {item.description||"Catalog item "+item.sourceId}</li>)}</ul>{order.shipping_details&&<p>{order.shipping_details.name}<br/>{order.shipping_details.address?.line1}<br/>{order.shipping_details.address?.line2}<br/>{order.shipping_details.address?.city} {order.shipping_details.address?.state} {order.shipping_details.address?.postal_code}<br/>{order.shipping_details.address?.country}</p>}</details><small>Order {order.id}</small></article>):<p>{page>1?"No orders on this page.":filter==="ALL"?"No paid orders recorded.":"No orders match this filter."}</p>}{!ordersUnavailable&&<nav className="adminActions" aria-label="Paid order pages">{page>1&&<Link href={orderHref(filter,page-1)}>Previous page</Link>}<span>Page {page}</span>{hasNext&&<Link href={orderHref(filter,page+1)}>Next page</Link>}</nav>}</section>}
 </main>;
}

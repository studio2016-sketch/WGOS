import AdminNav from "../AdminNav";
import MarketingDeliverablesClient from "./MarketingDeliverablesClient";
import {commandAccess} from "../../../lib/authz";
import {getOperationsReferenceData} from "../../../lib/operations-board";
import {listMarketingDeliverables} from "../../../lib/marketing-deliverables";

export default async function MarketingPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const q=await searchParams; const access=await commandAccess();
 const refs=await getOperationsReferenceData(access.identity.auth_user_id,access.isGlobal); const brands:any[]=refs.brands as any[];
 const selectedBrand=brands.some((b:any)=>b.id===q.brand)?String(q.brand):"";
 const rows:any[]=await listMarketingDeliverables(access.identity.auth_user_id,access.isGlobal,selectedBrand||null) as any[];
 const outstanding=rows.filter(r=>!["PUBLISHED","CANCELLED"].includes(r.status)).length;
 const received=rows.filter(r=>["RECEIVED","IN_PRODUCTION","READY"].includes(r.status)).length;
 const blocked=rows.filter(r=>r.status==="BLOCKED").length;
 return <main className="admin"><AdminNav active="marketing" brands={brands} brand={selectedBrand}/>
  <header className="adminHead commandHero"><div><p className="eyebrow">WGOS · MARKETING</p><h1>Content Supply Chain</h1><p>Track every photo, video, flyer, fact, testimonial, show detail and other input needed to keep each brand's campaigns moving.</p><div className="heroSignals"><span>● {outstanding} OUTSTANDING</span><span>◈ {received} IN HAND</span><span>↗ {blocked} BLOCKED</span></div></div></header>
  <section className="opsPulse"><article><small>OPEN INPUTS</small><strong>{outstanding}</strong><span>still needed</span></article><article><small>IN HAND</small><strong>{received}</strong><span>ready or being produced</span></article><article><small>BLOCKED</small><strong>{blocked}</strong><span>needs intervention</span></article><article><small>TOTAL TRACKED</small><strong>{rows.length}</strong><span>current brand scope</span></article></section>
  <MarketingDeliverablesClient rows={rows} brands={brands}/>
 </main>;
}

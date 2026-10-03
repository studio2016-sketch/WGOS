import AdminNav from "../AdminNav";
import MarketingDeliverablesClient from "./MarketingDeliverablesClient";
import GrowthMetricsClient from "./GrowthMetricsClient";
import {commandAccess} from "../../../lib/authz";
import {getOperationsReferenceData} from "../../../lib/operations-board";
import {listMarketingDeliverables} from "../../../lib/marketing-deliverables";
import {listGrowthMetrics,summarizeGrowth} from "../../../lib/growth-metrics";

export default async function MarketingPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const q=await searchParams; const access=await commandAccess();
 const refs=await getOperationsReferenceData(access.identity.auth_user_id,access.isGlobal); const brands:any[]=refs.brands as any[];
 const selectedBrand=brands.some((b:any)=>b.id===q.brand)?String(q.brand):"";
 const [rows,metricRows]=await Promise.all([listMarketingDeliverables(access.identity.auth_user_id,access.isGlobal,selectedBrand||null),listGrowthMetrics(access.identity.auth_user_id,access.isGlobal,selectedBrand||null)]) as any;
 const metrics=summarizeGrowth(metricRows as any[]);
 const outstanding=rows.filter(r=>!["PUBLISHED","CANCELLED"].includes(r.status)).length;
 const received=rows.filter(r=>["RECEIVED","IN_PRODUCTION","READY"].includes(r.status)).length;
 const blocked=rows.filter(r=>r.status==="BLOCKED").length;
 return <main className="admin"><AdminNav active="marketing" brands={brands} brand={selectedBrand}/>
  <header className="adminHead commandHero"><div><p className="eyebrow">WGOS · MARKETING</p><h1>Content Supply Chain</h1><p>Track every photo, video, flyer, fact, testimonial, show detail and other input needed to keep each brand's campaigns moving.</p><div className="heroSignals"><span>● {outstanding} OUTSTANDING</span><span>◈ {received} IN HAND</span><span>↗ {blocked} BLOCKED</span></div></div></header>
  <section className="opsPulse"><article><small>OPEN INPUTS</small><strong>{outstanding}</strong><span>still needed</span></article><article><small>IN HAND</small><strong>{received}</strong><span>ready or being produced</span></article><article><small>BLOCKED</small><strong>{blocked}</strong><span>needs intervention</span></article><article><small>TOTAL TRACKED</small><strong>{rows.length}</strong><span>current brand scope</span></article></section>
  <MarketingDeliverablesClient rows={rows} brands={brands}/>
  <section className="opsPulse"><article><small>SOCIAL VIEWS</small><strong>{Number(metrics.views).toLocaleString()}</strong><span>tracked content views</span></article><article><small>OUTBOUND CLICKS</small><strong>{Number(metrics.clicks).toLocaleString()}</strong><span>social / video exits</span></article><article><small>LIST GROWTH</small><strong>{Number(metrics.signups).toLocaleString()}</strong><span>direct audience added</span></article><article><small>ATTRIBUTED REVENUE</small><strong>{"$"+(Number(metrics.revenueCents)/100).toLocaleString(undefined,{maximumFractionDigits:0})}</strong><span>{Number(metrics.sales).toLocaleString()} tracked sales</span></article></section>
  <GrowthMetricsClient rows={metricRows as any[]} brands={brands}/>
 </main>;
}

import Link from "next/link";
import {commercialSummary,listOpportunities} from "../../lib/commercial";
import {relationshipReferenceData} from "../../lib/relationships";
import CommercialForms from "./CommercialForms";
export default async function AdminPage(){
 let summary:any={pipeline:{opportunity_count:0,pipeline_value:0},stages:[]},opportunities:any[]=[],refs:any={brands:[],organizations:[],contacts:[]};
 try{[summary,opportunities,refs]=await Promise.all([commercialSummary(),listOpportunities(),relationshipReferenceData()]);}catch{}
 const pipelineValue=Number(summary.pipeline?.pipeline_value||0);
 return <main className="admin"><header className="adminHead"><div><p className="eyebrow">WGOS · COMMERCIAL COMMAND</p><h1>Commercial Command</h1><p>Canonical relationships, pipeline, proposals, contracts and activation into delivery.</p></div><div className="adminActions"><Link href="/admin/operations">Operations Board →</Link></div></header>
 <section className="principle"><strong>Lifecycle:</strong> relationship → opportunity → proposal → contract → payment → project → delivery → relationship history.</section>
 <section className="adminGrid"><article className="adminPanel"><p className="eyebrow">OPEN PIPELINE</p><h2>{"$"+pipelineValue.toLocaleString(undefined,{maximumFractionDigits:0})}</h2><p>{Number(summary.pipeline?.opportunity_count||0)} active opportunities</p></article><article className="adminPanel"><p className="eyebrow">GOVERNANCE</p><h2>Brand-native</h2><p>Every commercial record carries originating brand and legal context.</p></article><article className="adminPanel"><p className="eyebrow">DELIVERY</p><h2>Operations</h2><p>Won work can activate directly into the native WGOS Operations Board.</p></article></section>
 <CommercialForms brands={refs.brands} organizations={refs.organizations} contacts={refs.contacts} opportunities={opportunities}/>
 <section className="adminPanel" style={{marginTop:18}}><div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"end"}}><div><p className="eyebrow">PIPELINE</p><h2>Opportunities</h2></div></div>
 {opportunities.length===0?<div className="emptyAttention"><h2>Commercial engine ready.</h2><p>The commercial engine is live. New opportunities will appear here as they are created.</p></div>:<div style={{display:"grid",gap:8,marginTop:16}}>{opportunities.map((o:any)=><div key={o.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12,padding:"12px 0",borderTop:"1px solid rgba(255,255,255,.1)"}}><strong>{o.title}</strong><span>{o.brand_name}</span><span>{o.stage}</span><span>{"$"+Number(o.estimated_value||0).toLocaleString()}</span></div>)}</div>}
 </section></main>;
}
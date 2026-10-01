import Link from "next/link";
import {commercialSummary,listOpportunities} from "../../lib/commercial";
import {listProposals} from "../../lib/documents";
import {commercialReadiness,commercialLifecycleRecords} from "../../lib/commercial-lifecycle";
import {relationshipReferenceData} from "../../lib/relationships";
import CommercialForms from "./CommercialForms";
import AdminNav from "./AdminNav";
import RelationshipWorkspace from "./RelationshipWorkspace";
import OpportunityWorkspace from "./OpportunityWorkspace";
import LifecycleWorkspace from "./LifecycleWorkspace";
import ExecutiveAttention from "./ExecutiveAttention";
import IntegrationStatus from "./IntegrationStatus";
import ContractingReadiness from "./ContractingReadiness";
export default async function AdminPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const query=await searchParams;const selectedBrand=query.brand||"";
 let opportunities:any[]=[],proposals:any[]=[],readiness:any[]=[],lifecycle:any={agreements:[],payments:[],projects:[]},refs:any={brands:[],organizations:[],contacts:[]};
 try{[opportunities,refs,proposals,readiness,lifecycle]=await Promise.all([listOpportunities(),relationshipReferenceData(),listProposals(),commercialReadiness(),commercialLifecycleRecords()]);}catch{}
 if(selectedBrand){opportunities=opportunities.filter((o:any)=>o.brand_id===selectedBrand);proposals=proposals.filter((p:any)=>p.brand_id===selectedBrand);readiness=readiness.filter((r:any)=>r.id===selectedBrand);lifecycle={agreements:lifecycle.agreements.filter((x:any)=>x.brand_id===selectedBrand),payments:lifecycle.payments.filter((x:any)=>x.brand_id===selectedBrand),projects:lifecycle.projects.filter((x:any)=>x.brand_id===selectedBrand)};refs={...refs,organizations:refs.organizations.filter((x:any)=>(x.brand_ids||[]).includes(selectedBrand)),contacts:refs.contacts.filter((x:any)=>(x.brand_ids||[]).includes(selectedBrand))};}
 const open=opportunities.filter((o:any)=>!["WON","LOST"].includes(o.stage));const pipelineValue=open.reduce((n:number,o:any)=>n+Number(o.estimated_value||0),0);const activeProjects=lifecycle.projects.filter((p:any)=>["PLANNING","ACTIVE","BLOCKED"].includes(p.status));const blocked=activeProjects.filter((p:any)=>p.status==="BLOCKED").length;const waiting=proposals.filter((p:any)=>["APPROVED","SENT"].includes(p.status)).length;const readyBrands=readiness.filter((r:any)=>r.complete_for_signing&&r.terms_status==="APPROVED"&&r.complete_for_payment).length;
 return <main className="admin"><AdminNav active="commercial" brands={refs.brands} brand={selectedBrand}/>
 <header className="adminHead commandHero"><div><p className="eyebrow">WGOS · EXECUTIVE PULSE</p><h1>{selectedBrand?"Brand Command":"Command Center"}</h1><p>{selectedBrand?"Focused operating view for the selected brand.":"One governed view of commercial movement, delivery and decisions across the portfolio."}</p></div><div className="adminActions"><Link href="/admin/operations">Open Operations →</Link></div></header>
 <section className="pulseGrid" aria-label="Business pulse"><article><small>OPEN PIPELINE</small><strong>{"$"+pipelineValue.toLocaleString(undefined,{maximumFractionDigits:0})}</strong><span>{open.length} live opportunities</span></article><article><small>ACTIVE DELIVERY</small><strong>{activeProjects.length}</strong><span>{blocked?blocked+" blocked":"No blocked projects"}</span></article><article><small>CLIENT WAITING</small><strong>{waiting}</strong><span>proposals awaiting movement</span></article><article><small>READY BRANDS</small><strong>{readyBrands}<em>/{readiness.length}</em></strong><span>contract + payment ready</span></article></section>
 <ExecutiveAttention proposals={proposals} readiness={readiness} agreements={lifecycle.agreements} projects={lifecycle.projects}/>
 <section className="principle commandPrinciple"><strong>Operating rule:</strong> automate routine movement. Surface exceptions, approvals and decisions.</section>
 <OpportunityWorkspace opportunities={opportunities} proposals={proposals}/>
 <LifecycleWorkspace proposals={proposals} agreements={lifecycle.agreements} payments={lifecycle.payments} projects={lifecycle.projects}/>
 <ContractingReadiness rows={readiness}/><IntegrationStatus/>
 <RelationshipWorkspace organizations={refs.organizations} contacts={refs.contacts} brands={refs.brands}/>
 <CommercialForms brands={refs.brands} organizations={refs.organizations} contacts={refs.contacts} opportunities={opportunities} proposals={proposals} readiness={readiness}/></main>;
}
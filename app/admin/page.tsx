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
 let summary:any={pipeline:{opportunity_count:0,pipeline_value:0},stages:[]},opportunities:any[]=[],proposals:any[]=[],readiness:any[]=[],lifecycle:any={agreements:[],payments:[],projects:[]},refs:any={brands:[],organizations:[],contacts:[]};
 try{[summary,opportunities,refs,proposals,readiness,lifecycle]=await Promise.all([commercialSummary(),listOpportunities(),relationshipReferenceData(),listProposals(),commercialReadiness(),commercialLifecycleRecords()]);}catch{}
 if(selectedBrand){opportunities=opportunities.filter((o:any)=>o.brand_id===selectedBrand);proposals=proposals.filter((p:any)=>p.brand_id===selectedBrand);readiness=readiness.filter((r:any)=>r.id===selectedBrand);lifecycle={agreements:lifecycle.agreements.filter((x:any)=>x.brand_id===selectedBrand),payments:lifecycle.payments.filter((x:any)=>x.brand_id===selectedBrand),projects:lifecycle.projects.filter((x:any)=>x.brand_id===selectedBrand)};refs={...refs,organizations:refs.organizations.filter((x:any)=>(x.brand_ids||[]).includes(selectedBrand)),contacts:refs.contacts.filter((x:any)=>(x.brand_ids||[]).includes(selectedBrand))};}
 const pipelineValue=opportunities.filter((o:any)=>!["WON","LOST"].includes(o.stage)).reduce((n:number,o:any)=>n+Number(o.estimated_value||0),0);
 return <main className="admin"><AdminNav active="commercial" brands={refs.brands} brand={selectedBrand}/><header className="adminHead"><div><p className="eyebrow">WGOS · COMMERCIAL COMMAND</p><h1>Commercial Command</h1><p>Canonical relationships, pipeline, proposals, contracts and activation into delivery.</p></div><div className="adminActions"><Link href="/admin/operations">Operations Board →</Link></div></header>
 <ExecutiveAttention proposals={proposals} readiness={readiness} agreements={lifecycle.agreements} projects={lifecycle.projects}/>
 <section className="principle"><strong>Lifecycle:</strong> relationship → opportunity → proposal → contract → payment → project → delivery → relationship history.</section>
 <section className="adminGrid dashboardCards"><article className="adminPanel"><p className="eyebrow">OPEN PIPELINE</p><h2>{"$"+pipelineValue.toLocaleString(undefined,{maximumFractionDigits:0})}</h2><p>{opportunities.filter((o:any)=>!["WON","LOST"].includes(o.stage)).length} active opportunities</p></article><article className="adminPanel"><p className="eyebrow">GOVERNANCE</p><h2>Brand-native</h2><p>Every commercial record carries originating brand and legal context.</p></article><article className="adminPanel"><p className="eyebrow">DELIVERY</p><h2>Operations</h2><p>Won work can activate directly into the native WGOS Operations Board.</p></article></section>
 <RelationshipWorkspace organizations={refs.organizations} contacts={refs.contacts} brands={refs.brands}/>
 <OpportunityWorkspace opportunities={opportunities} proposals={proposals}/>
 <LifecycleWorkspace proposals={proposals} agreements={lifecycle.agreements} payments={lifecycle.payments} projects={lifecycle.projects}/>
 <ContractingReadiness rows={readiness}/>
 <IntegrationStatus/>
 <CommercialForms brands={refs.brands} organizations={refs.organizations} contacts={refs.contacts} opportunities={opportunities} proposals={proposals} readiness={readiness}/></main>;
}
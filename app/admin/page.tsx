import Link from "next/link";
import {commercialSummary,listOpportunities} from "../../lib/commercial";
import {listProposals} from "../../lib/documents";
import {commercialReadiness} from "../../lib/commercial-lifecycle";
import {relationshipReferenceData} from "../../lib/relationships";
import CommercialForms from "./CommercialForms";
import AdminNav from "./AdminNav";
import RelationshipWorkspace from "./RelationshipWorkspace";
import OpportunityWorkspace from "./OpportunityWorkspace";
export default async function AdminPage(){
 let summary:any={pipeline:{opportunity_count:0,pipeline_value:0},stages:[]},opportunities:any[]=[],proposals:any[]=[],readiness:any[]=[],refs:any={brands:[],organizations:[],contacts:[]};
 try{[summary,opportunities,refs,proposals,readiness]=await Promise.all([commercialSummary(),listOpportunities(),relationshipReferenceData(),listProposals(),commercialReadiness()]);}catch{}
 const pipelineValue=Number(summary.pipeline?.pipeline_value||0);
 return <main className="admin"><AdminNav active="commercial" brands={refs.brands}/><header className="adminHead"><div><p className="eyebrow">WGOS · COMMERCIAL COMMAND</p><h1>Commercial Command</h1><p>Canonical relationships, pipeline, proposals, contracts and activation into delivery.</p></div><div className="adminActions"><Link href="/admin/operations">Operations Board →</Link></div></header>
 <section className="principle"><strong>Lifecycle:</strong> relationship → opportunity → proposal → contract → payment → project → delivery → relationship history.</section>
 <section className="adminGrid dashboardCards"><article className="adminPanel"><p className="eyebrow">OPEN PIPELINE</p><h2>{"$"+pipelineValue.toLocaleString(undefined,{maximumFractionDigits:0})}</h2><p>{Number(summary.pipeline?.opportunity_count||0)} active opportunities</p></article><article className="adminPanel"><p className="eyebrow">GOVERNANCE</p><h2>Brand-native</h2><p>Every commercial record carries originating brand and legal context.</p></article><article className="adminPanel"><p className="eyebrow">DELIVERY</p><h2>Operations</h2><p>Won work can activate directly into the native WGOS Operations Board.</p></article></section>
 <RelationshipWorkspace organizations={refs.organizations} contacts={refs.contacts} brands={refs.brands}/>
 <OpportunityWorkspace opportunities={opportunities} proposals={proposals}/>
 <CommercialForms brands={refs.brands} organizations={refs.organizations} contacts={refs.contacts} opportunities={opportunities} proposals={proposals} readiness={readiness}/></main>;
}
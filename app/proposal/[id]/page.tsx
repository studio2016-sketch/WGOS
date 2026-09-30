import {notFound} from "next/navigation";
import {getPublicProposal} from "../../../lib/proposal-access";
import AcceptProposal from "./AcceptProposal";
export const dynamic="force-dynamic";
function money(value:any,currency:any){return new Intl.NumberFormat("en-US",{style:"currency",currency:String(currency||"USD").trim()}).format(Number(value||0));}
export default async function ProposalPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{access?:string}>}){
 const {id}=await params;const q=await searchParams;const access=String(q.access||"");if(!access)notFound();const data:any=await getPublicProposal(id,access);if(!data)notFound();const p=data.proposal;
 return <main className="clientProposal"><header className="proposalHero"><p className="proposalBrand">{p.brand_name}</p><span>PRIVATE PROPOSAL · VERSION {p.version}</span><h1>{p.opportunity_title||"Proposal"}</h1>{p.organization_name&&<p>Prepared exclusively for {p.organization_name}</p>}</header>
  <div className="proposalBody">{data.sections.map((s:any,i:number)=><section className="proposalSection" key={i}><p className="eyebrow">{s.section_type}</p><h2>{s.title||s.section_type}</h2><div className="proposalCopy">{typeof s.content==="string"?s.content:<pre>{JSON.stringify(s.content,null,2)}</pre>}</div></section>)}
  <section className="proposalInvestment"><p className="eyebrow">INVESTMENT</p><h2>Engagement Summary</h2>{data.items.map((x:any,i:number)=><div className="investmentLine" key={i}><div><strong>{x.name}</strong>{x.description&&<small>{x.description}</small>}</div><strong>{money((Number(x.unit_amount_cents)*Number(x.quantity)+Number(x.tax_cents))/100,p.currency)}</strong></div>)}<div className="proposalTotals"><span>Total investment <strong>{money(p.one_time_total,p.currency)}</strong></span>{Number(p.deposit_amount)>0&&<span>Deposit <strong>{money(p.deposit_amount,p.currency)}</strong></span>}</div></section>
  <AcceptProposal proposalId={id} access={access}/></div><footer className="proposalFooter">Powered by WGOS · Secure private proposal</footer></main>;
}
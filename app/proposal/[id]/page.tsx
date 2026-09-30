import {notFound} from "next/navigation";
import {getPublicProposal} from "../../../lib/proposal-access";
import AcceptProposal from "./AcceptProposal";

export const dynamic="force-dynamic";

function money(value:any,currency:any){return new Intl.NumberFormat("en-US",{style:"currency",currency:String(currency||"USD").trim()}).format(Number(value||0));}

export default async function ProposalPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{access?:string}>}){
 const {id}=await params;const q=await searchParams;const access=String(q.access||"");if(!access)notFound();
 const data:any=await getPublicProposal(id,access);if(!data)notFound();const p=data.proposal;
 return <main style={{maxWidth:900,margin:"0 auto",padding:"48px 24px",fontFamily:"system-ui,sans-serif"}}>
  <header style={{marginBottom:36}}><div>{p.brand_name}</div><h1>{p.opportunity_title||"Proposal"}</h1>{p.organization_name?<p>Prepared for {p.organization_name}</p>:null}</header>
  {data.sections.map((s:any,i:number)=><section key={i}><h2>{s.title||s.section_type}</h2><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{typeof s.content==="string"?s.content:JSON.stringify(s.content,null,2)}</pre></section>)}
  {data.items.length?<section><h2>Investment</h2>{data.items.map((x:any,i:number)=><div key={i} style={{display:"flex",justifyContent:"space-between",gap:20,padding:"10px 0",borderBottom:"1px solid #ddd"}}><span>{x.name}</span><strong>{money((Number(x.unit_amount_cents)*Number(x.quantity)+Number(x.tax_cents))/100,p.currency)}</strong></div>)}</section>:null}
  <section style={{marginTop:30}}><p><strong>Total:</strong> {money(p.one_time_total,p.currency)}</p>{Number(p.deposit_amount)>0?<p><strong>Deposit:</strong> {money(p.deposit_amount,p.currency)}</p>:null}</section>
  <AcceptProposal proposalId={id} access={access}/>
 </main>;
}

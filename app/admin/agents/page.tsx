import SiteAuditPanel from "./SiteAuditPanel";
import AdminNav from "../AdminNav";
import {commandAccess} from "../../../lib/authz";
import {getOperationsReferenceData} from "../../../lib/operations-board";
import {agentDefinitions,riskPolicies} from "../../../lib/agent-registry";
import {agentSchemaReady,listAgentRuns} from "../../../lib/agent-runs";

export default async function AgentsPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const query=await searchParams;const access=await commandAccess();
 const refs:any=await getOperationsReferenceData(access.identity.auth_user_id,access.isGlobal);
 const brands:any[]=refs.brands||[];const selectedBrand=brands.some((b:any)=>b.id===query.brand)?String(query.brand):"";
 const ready=agentDefinitions.filter(a=>a.status==="ready").length;
 const durable=await agentSchemaReady();const runs:any[]=durable?await listAgentRuns(brands.map((b:any)=>String(b.id)),access.isGlobal,20):[];
 return <main className="admin"><AdminNav active="agents" brands={brands} brand={selectedBrand}/>
  <header className="adminHead commandHero"><div><p className="eyebrow">WGOS · AGENT OPERATIONS</p><h1>Intelligence Control Plane</h1><p>Observe what specialized agents can inspect, what they may propose, and where human authority is mandatory. Phase 1 is read-only: no agent on this screen can mutate production.</p><div className="heroSignals"><span>● {ready} AUDIT AGENTS READY</span><span>◈ READ-ONLY PHASE</span><span>✦ HUMAN AUTHORITY</span></div></div></header>
  <section className="opsPulse"><article><small>AGENT ROSTER</small><strong>{agentDefinitions.length}</strong><span>specialized roles</span></article><article><small>READY TO AUDIT</small><strong>{ready}</strong><span>read-only capability</span></article><article><small>AUTONOMOUS PUBLISHING</small><strong>0</strong><span>intentionally disabled</span></article><article><small>PROTECTED CLASSES</small><strong>4</strong><span>risk / approval levels</span></article></section>
  <section className="adminPanel"><p className="eyebrow">OPERATING PRINCIPLE</p><h2>Autonomy is earned, not assumed.</h2><p>WGOS can automate observation first, then proposals, then narrowly proven reversible actions. Business, money, legal, identity and security decisions remain governed by explicit policy.</p></section>
  <section className="adminPanel"><p className="eyebrow">LIVE READ-ONLY INSPECTION</p><h2>Technical + discovery baseline</h2><SiteAuditPanel brands={brands} initialBrand={selectedBrand}/></section>
  <section className="adminPanel"><p className="eyebrow">RUN HISTORY</p><h2>Durable evidence trail</h2>{!durable?<p>Agent persistence is staged but the control-plane schema is not yet commissioned in this environment.</p>:runs.length===0?<p>No durable agent runs have been recorded yet.</p>:<div className="todayList">{runs.map((r:any)=><div key={r.id}><time>{String(r.status)}</time><strong>{agentDefinitions.find(a=>a.id===r.agent_id)?.name||r.agent_id} · {r.brand_name||"System"}</strong><small>{r.objective} · {new Date(r.created_at).toLocaleString()}</small></div>)}</div>}</section>
  <section className="adminPanel"><p className="eyebrow">SPECIALIST ROSTER</p><h2>Who is responsible for what</h2><div className="quickGrid">{agentDefinitions.map(a=><article key={a.id}><small>{a.domain} · CLASS {a.riskClass}</small><h3>{a.name}</h3><p>{a.purpose}</p><p><b>{a.status==="ready"?"READ-ONLY READY":"PLANNED"}</b> · {a.mode.toUpperCase()}</p><small>Completion proof: {a.checks.join(" · ")}</small></article>)}</div></section>
  <section className="adminPanel"><p className="eyebrow">APPROVAL POLICY</p><h2>What agents are allowed to do</h2><div className="todayList">{riskPolicies.map(p=><div key={p.riskClass}><time>CLASS {p.riskClass}</time><strong>{p.label}</strong><small>{p.rule}</small></div>)}</div></section>
  <section className="adminPanel"><p className="eyebrow">NEXT GATE</p><h2>Evidence before execution.</h2><p>The next implementation milestone is to connect read-only audits to durable run history and proof artifacts. Branch creation, previews, merges and production actions remain disabled until the data model, authorization path and approval UX pass review.</p></section>
 </main>;
}

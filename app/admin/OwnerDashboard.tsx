import Link from "next/link";

type OwnerDashboardProps = {
  identity:any;
  brands:any[];
  opportunities:any[];
  proposals:any[];
  projects:any[];
  agreements:any[];
  threads:any[];
  notifications:any[];
  decisionSignals:any[];
  selectedBrand?:string;
};

function money(value:number){
  return "$"+Number(value||0).toLocaleString(undefined,{maximumFractionDigits:0});
}
function q(selectedBrand?:string){
  return selectedBrand?"?brand="+encodeURIComponent(selectedBrand):"";
}

export default function OwnerDashboard({
  identity,brands,opportunities,proposals,projects,agreements,threads,notifications,decisionSignals,selectedBrand
}:OwnerDashboardProps){
  const openOpportunities=opportunities.filter((o:any)=>!["WON","LOST"].includes(String(o.stage)));
  const pipelineValue=openOpportunities.reduce((n:number,o:any)=>n+Number(o.estimated_value||0),0);
  const activeProjects=projects.filter((p:any)=>["PLANNING","ACTIVE","BLOCKED"].includes(String(p.status)));
  const blockedProjects=activeProjects.filter((p:any)=>String(p.status)==="BLOCKED");
  const waitingThreads=threads.filter((t:any)=>String(t.recent_direction)==="INBOUND");
  const ownerReviewProposals=proposals.filter((p:any)=>["DRAFT","OWNER_REVIEW","REVIEW_REQUIRED"].includes(String(p.status)));
  const clientProposals=proposals.filter((p:any)=>["APPROVED","SENT"].includes(String(p.status)));
  const query=q(selectedBrand);

  const attention=[
    ...ownerReviewProposals.slice(0,2).map((p:any)=>({
      eyebrow:"APPROVAL",
      title:"Review & approve proposal",
      detail:(p.title||p.client_name||"Proposal")+" · "+money(Number(p.total_amount||p.total||p.amount||0)),
      href:"/admin?proposal="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):"")+"#commercial-forms",
      tone:"gold"
    })),
    ...blockedProjects.slice(0,1).map((p:any)=>({
      eyebrow:"PROJECT",
      title:"Resolve blocked delivery",
      detail:p.title,
      href:"/admin/operations?project="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):""),
      tone:"blue"
    })),
    ...waitingThreads.slice(0,1).map((t:any)=>({
      eyebrow:"CLIENT",
      title:"Respond to waiting client",
      detail:t.subject||t.title||"Inbound conversation waiting",
      href:"/admin/communications?thread="+encodeURIComponent(t.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):""),
      tone:"violet"
    })),
    ...decisionSignals.slice(0,1).map((s:any)=>({
      eyebrow:"DECISION",
      title:s.title||"Owner decision required",
      detail:s.summary||s.reason||"Review the surfaced decision.",
      href:"/admin"+query+"#decision-signals",
      tone:"violet"
    }))
  ].slice(0,3);

  if(!attention.length){
    attention.push({
      eyebrow:"CLEAR",
      title:"No attention items in loaded records",
      detail:"Open the detailed workspaces to review records and setup status.",
      href:"/admin"+query+"#owner-detail-workspaces",
      tone:"green"
    });
  }

  const startActions=[
    {label:"Reply to a client",detail:waitingThreads.length?waitingThreads.length+" waiting":"Open messages",icon:"✉",href:waitingThreads[0]?"/admin/communications?thread="+encodeURIComponent(waitingThreads[0].id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):""):"/admin/communications"+query},
    {label:"View calendar",detail:"Schedule & availability",icon:"◷",href:"/admin/calendar"+query},
    {label:"Review proposal",detail:ownerReviewProposals.length?ownerReviewProposals.length+" needs approval":"Commercial pipeline",icon:"◇",href:ownerReviewProposals[0]?"/admin/proposals/"+encodeURIComponent(ownerReviewProposals[0].id):"/admin"+query+"#commercial-lifecycle"},
    {label:"Contracts",detail:"Review or edit terms",icon:"▧",href:"/admin"+query+"#contracting"},
    {label:"Create / manage work",detail:"Projects, tasks, deliverables",icon:"▣",href:"/admin/operations"+query},
    {label:"People",detail:"Team, roles, access",icon:"♧",href:"/admin/people"+query},
    {label:"Money",detail:"Cash, expenses, payments",icon:"▤",href:"/admin/operations"+query+"#finance"},
    {label:"Marketing",detail:"Campaigns, content, growth",icon:"◎",href:"/admin/marketing"+query}
  ];

  const totalAttention=ownerReviewProposals.length+blockedProjects.length+waitingThreads.length+decisionSignals.length;
  const unvalued=openOpportunities.filter((o:any)=>!Number(o.estimated_value)).length;
  const shortcuts=[
    ...startActions,
    {label:"New lead or contact",detail:"Capture the next opportunity",icon:"＋",href:"/admin"+query+"#commercial-forms"},
    {label:"Inventory",detail:"Stock, products, replenishment",icon:"▦",href:"/admin/inventory"+query},
    {label:"Equipment",detail:"Assets, availability, readiness",icon:"♢",href:"/admin/equipment"+query},
    {label:"Websites & search",detail:"Search performance & sales",icon:"↗",href:"/admin/seo"+query}
  ];
  return <section className="ownerExperience efficientHome" aria-label="WGOS owner command">
    <div className="efficientHeading"><div><p className="eyebrow">WGOS · {selectedBrand?brands.find(b=>b.id===selectedBrand)?.name||"BUSINESS COMMAND":"EXECUTIVE COMMAND"}</p><h1>Your business, in focus.</h1><p>Review what needs attention. Move directly into the work.</p></div><Link href={"/admin"+query+"#commercial-forms"} className="newAction">＋ New lead</Link></div>
    <div className="efficientMetrics" aria-label="Current business records">
      <Link href={"/admin"+query+"#commercial"}><small>OPEN PIPELINE · ESTIMATE</small><strong>{money(pipelineValue)}</strong><span>{openOpportunities.length} opportunities{unvalued?" · "+unvalued+" without a value":""}</span></Link>
      <Link href={"/admin/operations"+query}><small>ACTIVE DELIVERY</small><strong>{activeProjects.length}</strong><span>{blockedProjects.length} blocked projects</span></Link>
      <Link href={"/admin/communications"+query}><small>CLIENT FOLLOW-UP</small><strong>{waitingThreads.length}</strong><span>conversations with latest reply inbound</span></Link>
      <Link href={"/admin"+query+"#commercial-lifecycle"}><small>PROPOSAL REVIEW</small><strong>{ownerReviewProposals.length}</strong><span>{clientProposals.length} proposal{clientProposals.length===1?"":"s"} with clients</span></Link>
    </div>
    <article className="efficientAttention" aria-label="Priority actions"><div className="efficientSectionHead"><div><p className="eyebrow">ATTENTION FIRST</p><h2>{totalAttention?"Your next moves":"No attention items in loaded records"}</h2></div><span>{totalAttention} attention items</span></div>
      <div className="efficientAttentionList">{attention.map((a:any,i:number)=><Link key={i} href={a.href}><span className={"attentionBadge "+a.tone}>{a.eyebrow}</span><span><strong>{a.title}</strong><small>{a.detail}</small></span><b aria-hidden="true">→</b></Link>)}</div>
      {totalAttention>attention.length&&<p className="efficientNote">Showing {attention.length} priorit{attention.length===1?"y":"ies"}. Use the counts above to review each queue.</p>}
    </article>
    <article id="start-here" className="efficientActions"><div className="efficientSectionHead"><div><p className="eyebrow">YOUR WORKSPACES</p><h2>What do you need to do?</h2></div><span>Every action keeps your selected business in view.</span></div><div className="efficientActionGrid">{shortcuts.map(a=><Link key={a.label} href={a.href}><b aria-hidden="true">{a.icon}</b><span><strong>{a.label}</strong><small>{a.detail}</small></span><i aria-hidden="true">↗</i></Link>)}</div></article>
    <p className="efficientNote">Pipeline is estimated opportunity value. Review actual payments and expenses in <Link href={"/admin/operations"+query+"#finance"}>Money</Link>.</p>
  </section>;
}

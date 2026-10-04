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
  const pendingProposals=proposals.filter((p:any)=>["APPROVED","SENT"].includes(String(p.status)));
  const signedAgreements=agreements.filter((a:any)=>["SIGNED","ACTIVE","EXECUTED"].includes(String(a.status)));
  const firstName=String(identity?.role)==="OWNER"&&!selectedBrand?"Jermaine":(String(identity?.display_name||identity?.email||"Owner").split(/[ @]/)[0]||"Owner");
  const query=q(selectedBrand);

  const attention=[
    ...blockedProjects.slice(0,2).map((p:any)=>({
      eyebrow:"PROJECT",
      title:"Resolve blocked delivery",
      detail:p.title,
      href:"/admin/operations?project="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):""),
      tone:"gold"
    })),
    ...pendingProposals.slice(0,2).map((p:any)=>({
      eyebrow:"CLIENT",
      title:"Review proposal movement",
      detail:p.title||p.client_name||"Proposal awaiting movement",
      href:"/admin?proposal="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):""),
      tone:"blue"
    })),
    ...decisionSignals.slice(0,1).map((s:any)=>({
      eyebrow:"DECISION",
      title:s.title||"Owner decision required",
      detail:s.summary||s.reason||"Review the surfaced decision.",
      href:"/admin"+query,
      tone:"violet"
    }))
  ].slice(0,3);

  if(!attention.length){
    attention.push({
      eyebrow:"CLEAR",
      title:"No owner-only decisions waiting",
      detail:"WGOS is suppressing routine movement and keeping the portfolio clear.",
      href:"/admin"+query,
      tone:"green"
    });
  }

  const domains=[
    {label:"Artists",meta:(openOpportunities.length||0)+" active",sub:"releases · bookings · audience",href:"/admin/marketing"+query,visual:"artist"},
    {label:"Live Productions",meta:activeProjects.length+" active",sub:blockedProjects.length?blockedProjects.length+" need attention":"delivery on track",href:"/admin/operations"+query,visual:"live"},
    {label:"Music School",meta:"Education",sub:"programs · enrollment · curriculum",href:"/admin/purpose"+query,visual:"school"},
    {label:"Premium Instruments",meta:"Bass One",sub:"products · clients · production",href:"/admin/equipment"+query,visual:"instrument"},
    {label:"Finance",meta:money(pipelineValue),sub:"visible opportunity value",href:"/admin/operations"+query+"#finance",visual:"finance"},
    {label:"Contracts",meta:signedAgreements.length+" active",sub:pendingProposals.length+" awaiting movement",href:"/admin"+query+"#contracting",visual:"contracts"},
    {label:"Clients",meta:waitingThreads.length+" waiting",sub:waitingThreads.length?"responses need attention":"relationships moving",href:"/admin"+query+"#relationships",visual:"clients"},
    {label:"Projects",meta:activeProjects.length+" active",sub:blockedProjects.length?blockedProjects.length+" blocked":"portfolio healthy",href:"/admin/operations"+query,visual:"projects"}
  ];

  const systems=[
    {label:"Artists",text:openOpportunities.length?"Opportunities and audience movement visible":"No exceptions surfaced"},
    {label:"Live Productions",text:blockedProjects.length?blockedProjects.length+" delivery exception"+(blockedProjects.length===1?"":"s"):"Builds and timelines moving"},
    {label:"Music School",text:"Purpose, program and growth workspace available"},
    {label:"Instruments",text:"Assets and product operations available"},
    {label:"Finance",text:pipelineValue?money(pipelineValue)+" visible in open opportunity value":"No finance exception surfaced"},
    {label:"Clients & Projects",text:waitingThreads.length?waitingThreads.length+" inbound response"+(waitingThreads.length===1?"":"s")+" waiting":"Relationships and delivery synchronized"}
  ];

  const upcoming=activeProjects.slice(0,3);
  const highlights=[
    {label:"Open pipeline",value:money(pipelineValue),detail:openOpportunities.length+" live opportunities"},
    {label:"Signed work",value:String(signedAgreements.length),detail:"active / executed agreements"},
    {label:"Client motion",value:String(waitingThreads.length),detail:"inbound conversations waiting"},
    {label:"Signals",value:String(notifications.length),detail:"current system notices"}
  ];

  return <section className="ownerExperience" aria-label="WGOS owner command">
    <div className="ownerHero">
      <div className="ownerHeroCopy">
        <p className="ownerKicker">WGOS · {selectedBrand?"BRAND COMMAND":"OWNER COMMAND"}</p>
        <h1>Good morning,<br/>{firstName}.</h1>
        <p className="ownerLead">{selectedBrand?"This brand is in motion.":"Your world is in motion."}<br/>Purpose, people, opportunities and delivery in one calm command surface.</p>
        <blockquote>“A bigger tomorrow<br/>for more people through music.”</blockquote>
      </div>
      <div className="ownerHeroScene" aria-hidden="true">
        <div className="ownerSun"/>
        <div className="ownerMountain m1"/>
        <div className="ownerMountain m2"/>
        <div className="ownerTerrace"/>
        <span>Same Vision<br/>Further</span>
      </div>
    </div>

    <div className="ownerDomainGrid">
      {domains.map((d:any)=><Link key={d.label} href={d.href} className="ownerDomainCard">
        <div className={"ownerVisual "+d.visual}><i/><b/><em/></div>
        <div className="ownerDomainBody"><h2>{d.label}</h2><strong>{d.meta}</strong><span>{d.sub}</span></div>
      </Link>)}
    </div>

    <div className="ownerMidGrid">
      <article className="ownerPanel ownerAttention">
        <div className="ownerPanelHead"><div><p>WHAT NEEDS ONLY YOU</p><h2>{attention.length} owner decision{attention.length===1?"":"s"}</h2></div><Link href={"/admin"+query}>→</Link></div>
        <div className="ownerAttentionList">{attention.map((a:any,i:number)=><Link key={i} href={a.href} className={"ownerAttentionItem "+a.tone}>
          <div className="ownerAttentionThumb"><span>{a.eyebrow.slice(0,1)}</span></div>
          <div><small>{a.eyebrow}</small><strong>{a.title}</strong><span>{a.detail}</span></div>
          <b>Today</b>
        </Link>)}</div>
      </article>

      <article className="ownerPanel ownerSystems">
        <div className="ownerStatusMark">✓</div>
        <div><p>ALL SYSTEMS QUIETLY MOVING</p><h2>{blockedProjects.length?"Exceptions are contained and visible.":"Operations, teams and timelines are on track."}</h2></div>
        <div className="ownerSystemList">{systems.map((s:any)=><div key={s.label}><i>◉</i><span><strong>{s.label}</strong><small>{s.text}</small></span></div>)}</div>
      </article>
    </div>

    <div className="ownerLowerGrid">
      <article className="ownerPanel ownerOutlook">
        <div className="ownerPanelHead"><div><p>COMMERCIAL OUTLOOK</p><h2>{money(pipelineValue)}</h2></div><span>Open pipeline</span></div>
        <div className="ownerBars">{[22,30,27,36,40,48,52,61,58,72,80,92].map((h,i)=><i key={i} style={{height:h+"%"}}/>)}</div>
        <div className="ownerOutlookLegend"><span><b>{money(pipelineValue)}</b> opportunity value</span><span><b>{openOpportunities.length}</b> live opportunities</span><span><b>{signedAgreements.length}</b> active agreements</span></div>
      </article>

      <article className="ownerPanel ownerUpcoming">
        <div className="ownerPanelHead"><div><p>UPCOMING DELIVERY</p><h2>Live movement</h2></div><Link href={"/admin/operations"+query}>→</Link></div>
        <div className="ownerTimeline">{upcoming.length?upcoming.map((p:any,i:number)=><Link key={p.id} href={"/admin/operations?project="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):"")}><i/><span><small>{i===0?"NOW":i===1?"NEXT":"AFTER"}</small><strong>{p.title}</strong><em>{p.status}</em></span></Link>):<div className="ownerEmpty">No active delivery projects yet.</div>}</div>
      </article>
    </div>

    <div className="ownerBottomGrid">
      <article className="ownerPanel ownerHighlights">
        <div className="ownerPanelHead"><div><p>RECENT HIGHLIGHTS</p><h2>Portfolio pulse</h2></div><Link href={"/admin"+query}>→</Link></div>
        <div className="ownerHighlightGrid">{highlights.map((h:any,i:number)=><div key={h.label}><div className={"ownerMiniVisual v"+i}/><small>{h.label}</small><strong>{h.value}</strong><span>{h.detail}</span></div>)}</div>
      </article>
      <article className="ownerPanel ownerIdeas">
        <div className="ownerPanelHead"><div><p>IDEAS FOR WHAT'S NEXT</p><h2>Forward motion</h2></div><span>→</span></div>
        <Link href={"/admin/marketing"+query}><i>◌</i><span><strong>Strengthen direct audience</strong><small>Turn current attention into owned relationships.</small></span></Link>
        <Link href={"/admin/operations"+query}><i>⌂</i><span><strong>Productize repeatable delivery</strong><small>Make the best process easier to repeat across brands.</small></span></Link>
        <Link href={"/admin/purpose"+query}><i>◎</i><span><strong>Greenlight the next purpose-aligned move</strong><small>Use purpose as the filter before scale.</small></span></Link>
      </article>
    </div>

    <div className="ownerDeepLink"><span>Need the full operating detail?</span><a href="#owner-detail-workspaces">Open deep workspaces ↓</a></div>
  </section>;
}

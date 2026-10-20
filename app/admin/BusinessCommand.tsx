import Link from "next/link";

type Props={
  brands:any[];
  selectedBrand?:string;
  opportunities?:any[];
  proposals?:any[];
  projects?:any[];
  agreements?:any[];
  threads?:any[];
};

function qs(id:string){return "?brand="+encodeURIComponent(id)}
function normalize(name:string){return String(name||"").trim().toLowerCase()}
function money(value:number){return "$"+Number(value||0).toLocaleString(undefined,{maximumFractionDigits:0})}

function profile(name:string){
 const n=normalize(name);
 if(n.includes("studio2016")) return {
  label:"Production Company",
  focus:"Sell, contract, staff and deliver productions.",
  specialty:[
   ["Bookings & leads","/admin","Move inquiries through discovery and proposal."],
   ["Productions","/admin/operations","Control shows, crews, tasks and delivery."],
   ["Resources","/admin/equipment","Manage production assets and readiness."],
   ["Marketing","/admin/marketing","Build campaigns and direct audience."]
  ]
 };
 if(n.includes("bass one")) return {
  label:"Premium Instruments",
  focus:"Manage commissions, builds, clients and instrument production.",
  specialty:[
   ["Commissions","/admin","Turn inquiries into approved custom builds."],
   ["Builds","/admin/operations","Track each instrument as a production project."],
   ["Inventory & tools","/admin/equipment","Manage instruments, shop assets and service."],
   ["Growth","/admin/marketing","Manage launches, artist relationships and demand."]
  ]
 };
 if(n.includes("sound legacy")) return {
  label:"Music School",
  focus:"Operate programs, enrollment, faculty work and growth.",
  specialty:[
   ["Programs","/admin/purpose","Manage mission, programs and curriculum priorities."],
   ["Enrollment pipeline","/admin","Track prospective students and relationships."],
   ["School operations","/admin/operations","Run classes, initiatives and internal projects."],
   ["Communications","/admin/communications","Manage student, parent and faculty conversations."]
  ]
 };
 if(n.includes("dionne")) return {
  label:"Retail / E-commerce",
  focus:"Manage demand, campaigns, customers and fulfillment work.",
  specialty:[
   ["Sales pipeline","/admin","Track customer and wholesale opportunities."],
   ["Fulfillment","/admin/operations","Run launches, inventory work and operational tasks."],
   ["Marketing","/admin/marketing","Manage campaigns, content and attributed growth."],
   ["Customers","/admin","Manage customer relationships and follow-up."]
  ]
 };
 if(n.includes("charmin")&&n.includes("jermaine")) return {
  label:"Artist Duo",
  focus:"Manage bookings, performances, clients and audience growth.",
  specialty:[
   ["Bookings","/admin","Manage inquiries, proposals and deposits."],
   ["Shows","/admin/operations","Run rehearsal, production and event delivery."],
   ["Audience","/admin/marketing","Coordinate content, campaigns and list growth."],
   ["Schedule","/admin/calendar","Coordinate appearances, holds and commitments."]
  ]
 };
 if(n.includes("jermaine williams")) return {
  label:"Artist / Executive Brand",
  focus:"Manage bookings, releases, partnerships and brand opportunities.",
  specialty:[
   ["Bookings & partnerships","/admin","Manage commercial opportunities and approvals."],
   ["Projects & releases","/admin/operations","Control active creative and business initiatives."],
   ["Audience growth","/admin/marketing","Manage content, campaigns and conversion."],
   ["Schedule","/admin/calendar","Coordinate shows, sessions and executive commitments."]
  ]
 };
 if(n.includes("charmin greene")) return {
  label:"Artist / Personal Brand",
  focus:"Manage bookings, partnerships, content and client commitments.",
  specialty:[
   ["Bookings","/admin","Manage inquiries, proposals and contracts."],
   ["Projects","/admin/operations","Run active engagements and internal initiatives."],
   ["Marketing","/admin/marketing","Coordinate campaigns, content and audience growth."],
   ["Schedule","/admin/calendar","Coordinate appearances and commitments."]
  ]
 };
 if(n.includes("cg")||n.includes("success")) return {
  label:"Consulting / Enterprise",
  focus:"Manage clients, engagements, deliverables and commercial growth.",
  specialty:[
   ["Client pipeline","/admin","Manage opportunities and proposals."],
   ["Engagements","/admin/operations","Track consulting projects and deliverables."],
   ["Relationships","/admin","Manage organizations, contacts and follow-up."],
   ["Finance","/admin/operations#finance","Control expenses, cash envelopes and exceptions."]
  ]
 };
 return {
  label:"Business",
  focus:"Manage revenue, delivery, relationships and growth from WGOS.",
  specialty:[
   ["Commercial","/admin","Manage pipeline, proposals and agreements."],
   ["Operations","/admin/operations","Manage projects, tasks and delivery."],
   ["Marketing","/admin/marketing","Manage campaigns and growth."],
   ["Schedule","/admin/calendar","Manage dates and commitments."]
  ]
 };
}

const universal=[
 ["Revenue","/admin","Pipeline · proposals · approvals"],
 ["Operations","/admin/operations","Projects · tasks · delivery"],
 ["Finance","/admin/operations#finance","Cash · expenses · exceptions"],
 ["Contracts","/admin#contracting","Terms · signatures · obligations"],
 ["Clients","/admin#relationships","Organizations · contacts · history"],
 ["Comms","/admin/communications","Threads · responses · follow-up"],
 ["Schedule","/admin/calendar","Dates · commitments · holds"],
 ["Resources","/admin/equipment","Assets · availability · readiness"],
 ["Growth","/admin/marketing","Campaigns · content · attribution"],
 ["Purpose","/admin/purpose","Strategy · decisions · learning"]
];

function withBrand(path:string,id:string){
 const [base,hash]=path.split("#");
 return base+qs(id)+(hash?"#"+hash:"");
}

export default function BusinessCommand({
 brands,selectedBrand,opportunities=[],proposals=[],projects=[],agreements=[],threads=[]
}:Props){
 const visible=selectedBrand?brands.filter(b=>String(b.id)===String(selectedBrand)):brands;
 const portfolioPipeline=opportunities.filter((o:any)=>!["WON","LOST"].includes(String(o.stage))).reduce((n:number,o:any)=>n+Number(o.estimated_value||0),0);
 const totalOwnerReview=proposals.filter((p:any)=>["DRAFT","OWNER_REVIEW","REVIEW_REQUIRED"].includes(String(p.status))).length;
 const totalBlocked=projects.filter((p:any)=>String(p.status)==="BLOCKED").length;
 const totalWaiting=threads.filter((t:any)=>String(t.recent_direction)==="INBOUND").length;

 return <section className="businessCommand" aria-label="Business management command">
  <div className="businessCommandHead">
   <div><p className="eyebrow">{selectedBrand?"BUSINESS COMMAND":"PORTFOLIO BUSINESS COMMAND"}</p><h2>{selectedBrand?"Run this business":"Run every business from one operating system"}</h2><p>{selectedBrand?"Revenue, delivery, finance, clients and execution for the selected company are gathered here.":"Choose a company and move directly into the work that generates revenue, fulfills commitments and protects margin."}</p></div>
   <div className="businessCommandSummary">
    <span><small>PIPELINE</small><strong>{money(portfolioPipeline)}</strong></span>
    <span><small>OWNER APPROVALS</small><strong>{totalOwnerReview}</strong></span>
    <span><small>BLOCKED</small><strong>{totalBlocked}</strong></span>
    <span><small>CLIENT WAITING</small><strong>{totalWaiting}</strong></span>
   </div>
  </div>
  <div className={"businessCommandGrid "+(selectedBrand?"single":"")}>
   {visible.map((b:any)=>{
    const p=profile(b.name);
    const brandId=String(b.id);
    const open=opportunities.filter((o:any)=>String(o.brand_id)===brandId&&!["WON","LOST"].includes(String(o.stage)));
    const pipeline=open.reduce((n:number,o:any)=>n+Number(o.estimated_value||0),0);
    const review=proposals.filter((x:any)=>String(x.brand_id)===brandId&&["DRAFT","OWNER_REVIEW","REVIEW_REQUIRED"].includes(String(x.status)));
    const active=projects.filter((x:any)=>String(x.brand_id)===brandId&&["PLANNING","ACTIVE","BLOCKED"].includes(String(x.status)));
    const blocked=active.filter((x:any)=>String(x.status)==="BLOCKED");
    const waiting=threads.filter((x:any)=>String(x.brand_id)===brandId&&String(x.recent_direction)==="INBOUND");
    const signed=agreements.filter((x:any)=>String(x.brand_id)===brandId&&["SIGNED","ACTIVE","EXECUTED"].includes(String(x.status)));
    const priority=review.length
      ? {label:"Approve proposal",detail:review[0]?.title||review[0]?.client_name||"Proposal awaiting owner review",href:"/admin?proposal="+encodeURIComponent(review[0].id)+"&brand="+encodeURIComponent(brandId)+"#commercial-forms",tone:"gold"}
      : blocked.length
      ? {label:"Resolve blocked delivery",detail:blocked[0]?.title||"Project needs intervention",href:"/admin/operations?project="+encodeURIComponent(blocked[0].id)+"&brand="+encodeURIComponent(brandId),tone:"red"}
      : waiting.length
      ? {label:"Respond to client",detail:waiting[0]?.subject||waiting[0]?.title||"Inbound conversation waiting",href:"/admin/communications"+qs(brandId),tone:"violet"}
      : open.length
      ? {label:"Advance pipeline",detail:open[0]?.title||open[0]?.name||"Open commercial opportunity",href:"/admin?brand="+encodeURIComponent(brandId)+"&opportunity="+encodeURIComponent(open[0].id),tone:"blue"}
      : {label:"No exception waiting",detail:"Routine movement is clear.",href:"/admin"+qs(brandId),tone:"green"};

    return <article key={b.id} className="businessCard">
     <div className="businessCardTitle"><div><small>{p.label}</small><h3>{b.name}</h3><p>{p.focus}</p></div><Link href={"/admin"+qs(brandId)}>Open →</Link></div>

     <div className="businessPulse">
      <Link href={"/admin"+qs(brandId)}><small>OPEN PIPELINE</small><strong>{money(pipeline)}</strong><span>{open.length} opportunity{open.length===1?"":"ies"}</span></Link>
      <Link href={"/admin/operations"+qs(brandId)}><small>ACTIVE DELIVERY</small><strong>{active.length}</strong><span>{blocked.length?blocked.length+" blocked":"on track"}</span></Link>
      <Link href={"/admin"+qs(brandId)+"#contracting"}><small>SIGNED WORK</small><strong>{signed.length}</strong><span>active agreements</span></Link>
      <Link href={"/admin/communications"+qs(brandId)}><small>CLIENT WAITING</small><strong>{waiting.length}</strong><span>{waiting.length?"respond now":"clear"}</span></Link>
     </div>

     <Link href={priority.href} className={"businessPriority "+priority.tone}><span><small>NEXT BEST ACTION</small><strong>{priority.label}</strong><em>{priority.detail}</em></span><b>→</b></Link>

     <div className="businessSpecialty">
      {p.specialty.map(([label,path,desc])=><Link key={label} href={withBrand(String(path),brandId)}><strong>{label}</strong><span>{desc}</span></Link>)}
     </div>
     <div className="businessUniversal">
      {universal.map(([label,path,desc])=><Link key={label} href={withBrand(String(path),brandId)}><b>{label}</b><small>{desc}</small></Link>)}
     </div>
    </article>
   })}
  </div>
 </section>
}
import Link from "next/link";

type Props={brands:any[];selectedBrand?:string};

function qs(id:string){return "?brand="+encodeURIComponent(id)}
function normalize(name:string){return String(name||"").trim().toLowerCase()}

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

export default function BusinessCommand({brands,selectedBrand}:Props){
 const visible=selectedBrand?brands.filter(b=>String(b.id)===String(selectedBrand)):brands;
 return <section className="businessCommand" aria-label="Business management command">
  <div className="businessCommandHead">
   <div><p className="eyebrow">{selectedBrand?"BUSINESS COMMAND":"PORTFOLIO BUSINESS COMMAND"}</p><h2>{selectedBrand?"Run this business":"Run every business from one operating system"}</h2><p>{selectedBrand?"The most useful operating controls for the selected company are gathered here.":"Choose a company, then move directly into revenue, delivery, finance, contracts, clients, communications, schedule, resources, growth or purpose."}</p></div>
  </div>
  <div className={"businessCommandGrid "+(selectedBrand?"single":"")}>
   {visible.map((b:any)=>{
    const p=profile(b.name);
    return <article key={b.id} className="businessCard">
     <div className="businessCardTitle"><div><small>{p.label}</small><h3>{b.name}</h3><p>{p.focus}</p></div><Link href={"/admin"+qs(String(b.id))}>Open →</Link></div>
     <div className="businessSpecialty">
      {p.specialty.map(([label,path,desc])=><Link key={label} href={withBrand(String(path),String(b.id))}><strong>{label}</strong><span>{desc}</span></Link>)}
     </div>
     <div className="businessUniversal">
      {universal.map(([label,path,desc])=><Link key={label} href={withBrand(String(path),String(b.id))}><b>{label}</b><small>{desc}</small></Link>)}
     </div>
    </article>
   })}
  </div>
 </section>
}
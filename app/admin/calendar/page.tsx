import AdminNav from "../AdminNav";
import CalendarWorkspace from "../CalendarWorkspace";
import {commandAccess} from "../../../lib/authz";
import {db} from "../../../lib/db";
import {getOperationsReferenceData} from "../../../lib/operations-board";
import {listOperationsProjects} from "../../../lib/operations-board";
import {listCalendarEvents} from "../../../lib/calendar";
export default async function CalendarPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const query=await searchParams;
 const {identity,isGlobal}=await commandAccess();
 const [refs,projects,scheduled]=await Promise.all([
  getOperationsReferenceData(identity.auth_user_id,isGlobal),
  listOperationsProjects(identity.auth_user_id,isGlobal),
  listCalendarEvents(query.brand)
 ]);
 const brandIds=refs.brands.map(b=>b.id).filter(id=>!query.brand||id===query.brand);
 const shows=await db()`SELECT e.id,e.brand_id,e.project_id,e.event_name AS title,e.event_start AS start_at,e.event_end AS end_at,e.status AS show_status,b.name AS brand_name,true AS is_show
   FROM wgos.production_events e JOIN wgos.brands b ON b.id=e.brand_id
   WHERE e.brand_id=ANY(${brandIds}::text[]) AND e.event_start IS NOT NULL`;
 const events=[...scheduled.filter(e=>brandIds.includes(e.brand_id)),...shows.map(e=>({...e,status:e.show_status==='ADVANCING'?'SCHEDULED':e.show_status}))];
 const now=Date.now(),upcoming=events.filter((e:any)=>new Date(e.start_at).getTime()>=now&&e.status==="SCHEDULED"),today=events.filter((e:any)=>new Date(e.start_at).toDateString()===new Date().toDateString()&&e.status==="SCHEDULED");
 return <main className="admin"><AdminNav active="calendar" brands={refs.brands} brand={query.brand}/><header className="adminHead commandHero"><div><p className="eyebrow">WGOS · TIME</p><h1>Schedule Command</h1><p>Calls, rehearsals, services, deadlines and delivery moments connected to brands and projects.</p><div className="heroSignals"><span>● {today.length} TODAY</span><span>↗ {upcoming.length} UPCOMING</span><span>◌ {events.length} EVENTS</span></div></div></header><section className="workspacePulse"><article><small>TODAY</small><strong>{today.length}</strong><span>scheduled events</span></article><article><small>UPCOMING</small><strong>{upcoming.length}</strong><span>future commitments</span></article><article><small>CONNECTED</small><strong>{events.filter((e:any)=>e.project_id).length}</strong><span>linked to projects</span></article></section><section className="principle"><strong>Schedule rule:</strong> time follows the operating record. Project commitments belong on one governed schedule, not in disconnected calendars.</section><CalendarWorkspace key={query.brand||"all"} selectedBrand={query.brand} initial={events} brands={refs.brands} projects={projects}/></main>;
}
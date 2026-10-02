import AdminNav from "../AdminNav";
import CalendarWorkspace from "../CalendarWorkspace";
import {relationshipReferenceData} from "../../../lib/relationships";
import {listOperationsProjects} from "../../../lib/operations-board";
import {listCalendarEvents} from "../../../lib/calendar";
export default async function CalendarPage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const query=await searchParams;let refs:any={brands:[]},projects:any[]=[],events:any[]=[];
 try{[refs,projects,events]=await Promise.all([relationshipReferenceData(),listOperationsProjects(),listCalendarEvents(query.brand)]);}catch{}
 const now=Date.now(),upcoming=events.filter((e:any)=>new Date(e.start_at).getTime()>=now&&e.status==="SCHEDULED"),today=events.filter((e:any)=>new Date(e.start_at).toDateString()===new Date().toDateString()&&e.status==="SCHEDULED");
 return <main className="admin"><AdminNav active="calendar" brands={refs.brands} brand={query.brand}/><header className="adminHead commandHero"><div><p className="eyebrow">WGOS · TIME</p><h1>Schedule Command</h1><p>Calls, rehearsals, services, deadlines and delivery moments connected to brands and projects.</p><div className="heroSignals"><span>● {today.length} TODAY</span><span>↗ {upcoming.length} UPCOMING</span><span>◌ {events.length} EVENTS</span></div></div></header><section className="workspacePulse"><article><small>TODAY</small><strong>{today.length}</strong><span>scheduled events</span></article><article><small>UPCOMING</small><strong>{upcoming.length}</strong><span>future commitments</span></article><article><small>CONNECTED</small><strong>{events.filter((e:any)=>e.project_id).length}</strong><span>linked to projects</span></article></section><section className="principle"><strong>Schedule rule:</strong> time follows the operating record. Project commitments belong on one governed schedule, not in disconnected calendars.</section><CalendarWorkspace initial={events} brands={refs.brands} projects={projects}/></main>;
}
import AdminNav from "../AdminNav";
import {commandAccess} from "../../../lib/authz";
import {db} from "../../../lib/db";
import ShowPrepClient from "./ShowPrepClient";

export default async function ShowPrepPage(){
 const access=await commandAccess();
 const sql=db();
 const brands=access.isGlobal
  ? await sql`SELECT b.id,b.name FROM wgos.brands b ORDER BY b.name`
  : await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships bm ON bm.brand_id=b.id WHERE bm.auth_user_id=${access.identity.auth_user_id} AND bm.active=true ORDER BY b.name`;
 const studio=brands.find((b:any)=>String(b.name).toLowerCase().includes("studio2016"));
 if(!studio)return <main className="admin"><AdminNav active="work" brands={brands as any[]}/><section className="adminPanel"><h1>Studio2016 Show Prep</h1><p>Studio2016 access is not available for this account.</p></section></main>;
 const [events,users,deliverables,runItems]=await Promise.all([
  sql`SELECT id,event_name,venue_name,event_start,event_end,load_in_at,doors_at,timezone,status FROM wgos.production_events WHERE brand_id=${studio.id} ORDER BY event_start DESC NULLS LAST LIMIT 100`,
  sql`SELECT auth_user_id,display_name,email FROM wgos.app_users WHERE active=true ORDER BY COALESCE(display_name,email)`,
  sql`SELECT c.id,c.production_event_id,c.checkpoint,c.owner_subject,c.due_at,c.status,c.notes,u.display_name AS owner_name FROM wgos.advancing_checkpoints c JOIN wgos.production_events e ON e.id=c.production_event_id LEFT JOIN wgos.app_users u ON u.auth_user_id=c.owner_subject WHERE e.brand_id=${studio.id} ORDER BY c.due_at NULLS LAST,c.checkpoint`,
  sql`SELECT r.id,r.production_event_id,r.position,r.cue_at,r.duration_seconds,r.title,r.department,r.owner_subject,r.notes,r.status,u.display_name AS owner_name FROM wgos.run_of_show_items r JOIN wgos.production_events e ON e.id=r.production_event_id LEFT JOIN wgos.app_users u ON u.auth_user_id=r.owner_subject WHERE e.brand_id=${studio.id} ORDER BY r.position,r.cue_at NULLS LAST`
 ]);
 return <main className="admin"><AdminNav active="showprep" brands={brands as any[]} brand={String(studio.id)}/><header className="adminHead"><div><p className="eyebrow">STUDIO2016 · PRODUCTION</p><h1>Show Prep</h1><p>Create a show plan and manage assignable production deliverables.</p></div></header><ShowPrepClient brandId={String(studio.id)} events={events as any[]} users={users as any[]} deliverables={deliverables as any[]} runItems={runItems as any[]}/></main>;
}

import AdminNav from "../AdminNav";
import {commandAccess} from "../../../lib/authz";
import {db} from "../../../lib/db";
import {getOperationsReferenceData} from "../../../lib/operations-board";

export default async function PeoplePage({searchParams}:{searchParams:Promise<{brand?:string}>}){
 const q=await searchParams;
 const access=await commandAccess();
 const refs:any=await getOperationsReferenceData(access.identity.auth_user_id,access.isGlobal);
 const brands:any[]=refs.brands||[];
 const selectedBrand=brands.some((b:any)=>b.id===q.brand)?String(q.brand):"";
 const sql=db();
 const rows:any[]=access.isGlobal
  ? await sql`SELECT u.auth_user_id,u.email,u.display_name,u.role,u.active,
      COALESCE(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'membershipRole',bm.role) ORDER BY b.name) FILTER (WHERE b.id IS NOT NULL),'[]'::jsonb) AS brands
     FROM wgos.app_users u
     LEFT JOIN wgos.brand_memberships bm ON bm.auth_user_id=u.auth_user_id AND bm.active=true
     LEFT JOIN wgos.brands b ON b.id=bm.brand_id
     WHERE u.active=true
     GROUP BY u.auth_user_id,u.email,u.display_name,u.role,u.active
     ORDER BY COALESCE(u.display_name,u.email),u.email`
  : await sql`SELECT u.auth_user_id,u.email,u.display_name,u.role,u.active,
      COALESCE(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'membershipRole',bm.role) ORDER BY b.name) FILTER (WHERE b.id IS NOT NULL),'[]'::jsonb) AS brands
     FROM wgos.app_users u
     JOIN wgos.brand_memberships mine ON mine.brand_id IN (
       SELECT brand_id FROM wgos.brand_memberships WHERE auth_user_id=${access.identity.auth_user_id} AND active=true
     ) AND mine.auth_user_id=u.auth_user_id AND mine.active=true
     LEFT JOIN wgos.brand_memberships bm ON bm.auth_user_id=u.auth_user_id AND bm.active=true
     LEFT JOIN wgos.brands b ON b.id=bm.brand_id
     WHERE u.active=true
     GROUP BY u.auth_user_id,u.email,u.display_name,u.role,u.active
     ORDER BY COALESCE(u.display_name,u.email),u.email`;
 const people=selectedBrand?rows.filter((p:any)=>(p.brands||[]).some((b:any)=>String(b.id)===selectedBrand)):rows;
 return <main className="admin">
  <AdminNav active="people" brands={brands} brand={selectedBrand}/>
  <header className="adminHead commandHero"><div><p className="eyebrow">WGOS · PEOPLE</p><h1>People & Responsibility</h1><p>See who is involved, which businesses they can access, and where ownership or assignment belongs.</p><div className="heroSignals"><span>● {people.length} PEOPLE</span><span>◈ {selectedBrand?"1 BUSINESS":"PORTFOLIO"}</span><span>↗ ROLE-AWARE</span></div></div></header>
  <section className="principle"><strong>Simple rule:</strong> people live here once. Projects, tasks, schedules and communications reference the same person record instead of duplicating personnel data.</section>
  <section className="peopleGrid">
   {people.map((p:any)=><article className="peopleCard" key={p.auth_user_id}>
    <div className="peopleAvatar">{String(p.display_name||p.email||"?").slice(0,1).toUpperCase()}</div>
    <div className="peopleIdentity"><small>{p.role||"TEAM"}</small><h2>{p.display_name||p.email}</h2><p>{p.email}</p></div>
    <div className="peopleScopes"><small>BUSINESS ACCESS</small><div>{(p.brands||[]).map((b:any)=><span key={b.id}>{b.name}<em>{b.membershipRole||""}</em></span>)}</div></div>
   </article>)}
   {!people.length&&<article className="adminPanel"><h2>No people in this scope yet.</h2><p className="muted">Add or assign personnel when the business is ready.</p></article>}
  </section>
 </main>;
}
import Link from 'next/link';
import {notFound} from 'next/navigation';
import AdminNav from '../../AdminNav';
import {canManageBrand,commandAccess} from '../../../../lib/authz';
import {db} from '../../../../lib/db';
import {listStudioPlannedEquipment} from '../../../../lib/studio-planned-equipment';
import {STUDIO_PLAN_BRAND} from '../../../../lib/studio-planned-equipment-input';
import {contractPursuitHref} from '../../../../lib/workspace-links';
import PlannedEquipmentCatalog from './PlannedEquipmentCatalog';

export const dynamic='force-dynamic';

export default async function PlannedEquipmentPage(){
 const {identity,isGlobal}=await commandAccess();
 if(!await canManageBrand(identity,STUDIO_PLAN_BRAND))notFound();
 const sql=db();
 const fetched=isGlobal?await sql`SELECT id,name FROM wgos.brands ORDER BY name`
  :await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships m ON m.brand_id=b.id WHERE m.auth_user_id=${identity.auth_user_id} AND m.active=true ORDER BY b.name`;
 const brands=fetched.map(row=>({id:String(row.id),name:String(row.name)}));
 if(!brands.some(brand=>brand.id===STUDIO_PLAN_BRAND))notFound();
 let catalog:Awaited<ReturnType<typeof listStudioPlannedEquipment>>|null=null;
 try{catalog=await listStudioPlannedEquipment();}catch{/* Fail closed, do not show an empty catalog as verified. */}
 return <main className="admin">
  <AdminNav active="pursuits" brand={STUDIO_PLAN_BRAND} brands={brands}/>
  <header className="adminHead"><div><p className="eyebrow">STUDIO2016 / CONTRACT PURSUIT</p><h1>Planned equipment</h1><p>Private planning prices for items not held in stock.</p></div>
   <Link href={contractPursuitHref(STUDIO_PLAN_BRAND)} className="pursuitBack">Back to Contract Pursuit</Link>
  </header>
  {catalog?<PlannedEquipmentCatalog {...catalog}/>:<section className="adminPanel" role="status"><h2>Planned catalog unavailable</h2><p>Reload before importing or relying on displayed counts. No inventory changes were made.</p></section>}
 </main>;
}

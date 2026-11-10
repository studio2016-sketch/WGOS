import PursuitWorkspace from "./PursuitWorkspace";
import {notFound} from 'next/navigation';
import {commandAccess} from '../../../lib/authz';
import {db} from '../../../lib/db';
import {studioPursuitBrand} from '../../../lib/workspace-links';
export const dynamic='force-dynamic';
export default async function PursuitsPage(){
 const access=await commandAccess();
 const sql=db();
 const brands=access.isGlobal?await sql`SELECT id,name FROM wgos.brands ORDER BY name`:await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships m ON m.brand_id=b.id WHERE m.auth_user_id=${access.identity.auth_user_id} AND m.active=true ORDER BY b.name`;
 const studio=studioPursuitBrand(brands as {id:string;name:string}[]);
 if(!studio)notFound();
 return <PursuitWorkspace brands={brands as any[]} studio={studio}/>;
}

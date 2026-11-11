import {notFound} from 'next/navigation';
import {commandAccess} from '../../../lib/authz';
import {db} from '../../../lib/db';
import {festivalBrand} from '../../../lib/workspace-links';
import AdminNav from '../AdminNav';
import FestivalWorkspace from './FestivalWorkspace';

export const dynamic='force-dynamic';
export default async function FestivalsPage(){
 const access=await commandAccess();
 const sql=db();
 const brands=access.isGlobal?await sql`SELECT id,name FROM wgos.brands ORDER BY name`:await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships m ON m.brand_id=b.id WHERE m.auth_user_id=${access.identity.auth_user_id} AND m.active=true ORDER BY b.name`;
 const artist=festivalBrand(brands as {id:string;name:string}[]);
 if(!artist)notFound();
 const imports=await sql`SELECT source_text FROM wgos.festival_campaign_imports WHERE brand_id=${artist.id}`;
 const history=String(imports[0]?.source_text||'No campaign history imported yet.');
 const records=history.split('\n').filter(line=>line.startsWith('| ')).map(line=>line.replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim())).filter(cells=>cells[0]!=='Festival'&&!/^[-]+$/.test(cells[0])).map(cells=>({festival:cells[0],details:cells.slice(1)}));
 return <main className="admin"><AdminNav active="festivals" brands={brands as any[]} brand={artist.id}/><header className="adminHead"><div><p className="eyebrow">CHARMIN &amp; JERMAINE / FESTIVAL BOOKINGS</p><h1>The next stage.</h1><p>2027 festival submissions, programming replies and the evidence behind each next move.</p></div></header><FestivalWorkspace records={records} history={history}/></main>;
}

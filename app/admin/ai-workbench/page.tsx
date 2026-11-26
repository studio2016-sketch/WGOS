import Link from 'next/link';
import {notFound} from 'next/navigation';
import {commandAccess} from '../../../lib/authz';
import AiWorkbench from './AiWorkbench';

export const dynamic='force-dynamic';

export default async function AiWorkbenchPage(){
 const access=await commandAccess();
 if(!access.isGlobal)notFound();
 return <main className="admin"><header className="adminHead" id="workspace-main">
  <div><p className="eyebrow">WGOS / PRIVATE OWNER WORKSPACE</p><h1>AI Workbench</h1>
   <p>Build a clear brief before asking an AI tool to help or taking an action.</p></div>
  <Link href="/admin" className="pursuitBack">Back to WGOS overview</Link>
 </header><AiWorkbench/></main>;
}

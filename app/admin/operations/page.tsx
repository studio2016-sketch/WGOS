import Link from "next/link";
import {getOperationsBoard,getOperationsReferenceData,listOperationsProjects} from "../../../lib/operations-board";
import NewProjectForm from "./NewProjectForm";
import OperationsBoardClient from "./OperationsBoardClient";
import RecurringRules from "./RecurringRules";
import AdminNav from "../AdminNav";

export default async function OperationsPage({searchParams}:{searchParams:Promise<{project?:string;brand?:string}>}){
 const query=await searchParams;
 const [projectRows,refs]=await Promise.all([listOperationsProjects(),getOperationsReferenceData()]);
 let projects:any[]=projectRows as any[];
 const users:any[]=refs.users as any[];
 const brands:any[]=refs.brands as any[];const selectedBrand=query.brand||"";if(selectedBrand)projects=projects.filter((p:any)=>p.brand_id===selectedBrand);
 let selectedId=query.project||projects[0]?.id||"";
 const totalTasks=projects.reduce((n:number,p:any)=>n+Number(p.task_count||0),0);
 const doneTasks=projects.reduce((n:number,p:any)=>n+Number(p.done_count||0),0);
 const blockedTasks=projects.reduce((n:number,p:any)=>n+Number(p.blocked_count||0),0);
 const overdueTasks=projects.reduce((n:number,p:any)=>n+Number(p.overdue_count||0),0);
 const portfolioProgress=totalTasks?Math.round(doneTasks/totalTasks*100):0;
 let board:any=selectedId?await getOperationsBoard(String(selectedId)):null;
 if(!board&&projects.length&&selectedId!==projects[0].id){
  selectedId=projects[0].id;
  board=await getOperationsBoard(String(selectedId));
 }

 return <main className="admin">
  <AdminNav active="operations" brands={brands} brand={selectedBrand}/>
  <header className="adminHead">
   <div><p className="eyebrow">WGOS · OPERATIONS</p><h1>Operations Board</h1><p>Projects, deliverables, dependencies, ownership, approvals and deadlines in one native workspace.</p></div>
   <div className="adminActions"><Link href={selectedBrand?"/admin?brand="+encodeURIComponent(selectedBrand):"/admin"}>Commercial Command →</Link><NewProjectForm brands={brands} users={users}/></div>
  </header>

  <section className="opsPulse"><article><small>ACTIVE PROJECTS</small><strong>{projects.length}</strong><span>current portfolio</span></article><article><small>PORTFOLIO PROGRESS</small><strong>{portfolioProgress}%</strong><span>{doneTasks} of {totalTasks} tasks complete</span></article><article><small>BLOCKED</small><strong>{blockedTasks}</strong><span>{blockedTasks?"needs intervention":"clear"}</span></article><article><small>OVERDUE</small><strong>{overdueTasks}</strong><span>{overdueTasks?"needs movement":"on schedule"}</span></article></section>

  <section className="principle">
   <strong>Operating rule:</strong> routine work moves here. Executive attention is reserved for approvals, exceptions, blocked dependencies and consequential decisions.
  </section>

  <section className="projectShowcase"><div className="workspaceTitle"><div><p className="eyebrow">ACTIVE DELIVERY</p><h2>Project Portfolio</h2><p className="muted">Visual health across current work. Open a project below for full delivery control.</p></div></div><div className="projectGallery">{projects.slice(0,6).map((p:any)=>{const total=Number(p.task_count||0),done=Number(p.done_count||0),progress=total?Math.round(done/total*100):0,risk=Number(p.blocked_count||0)+Number(p.overdue_count||0);return <Link key={"gallery-"+p.id} href={"/admin/operations?project="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):"")} className={"projectVisual "+(String(p.id)===String(selectedId)?"active":"")}><div className="projectGlow"/><div className="projectVisualTop"><span>{p.brand_name}</span><em>{p.status}</em></div><div className="projectVisualBody"><small>{risk?risk+" ATTENTION":"ON TRACK"}</small><h3>{p.title}</h3><p>{total} tasks · {done} complete</p></div><div className="projectProgress"><i style={{width:progress+"%"}}/><span>{progress}%</span></div></Link>})}</div></section><div className="operationsLayout">
   <aside className="adminPanel projectRail">
    <p className="eyebrow">PROJECTS</p>
    <div style={{display:"grid",gap:8}}>
     {projects.length===0&&<p className="muted">No projects yet. Create the first internal or client project above.</p>}
     {projects.map(p=>{
      const total=Number(p.task_count||0),done=Number(p.done_count||0);
      const progress=total?Math.round(done/total*100):0;
      const active=String(p.id)===String(selectedId);
      return <Link key={p.id} href={"/admin/operations?project="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):"")} className={"projectSelect "+(active?"active":"")}>
       <strong>{p.title}</strong>
       <small>{p.brand_name} · {p.status}</small>
       <div className="projectSelectMeta">
        <span>{progress}% complete</span><span>{Number(p.blocked_count||0)} blocked · {Number(p.overdue_count||0)} overdue</span>
       </div>
      </Link>;
     })}
    </div>
   </aside>

   <section className="operationsCanvas">
    {!board?<div className="adminPanel"><div className="emptyAttention"><h2>Create a project to begin.</h2><p>WGOS projects can be internal initiatives or automatically activated from paid client work.</p></div></div>:
     <div style={{display:"grid",gap:18}}>
      <OperationsBoardClient initialProject={board.project as any} initialTasks={board.tasks as any[]} dependencies={board.dependencies as any[]} users={board.users as any[]} initialComments={board.comments as any[]}/>
      <RecurringRules projectId={String(board.project.id)} users={board.users as any[]} initial={board.recurringRules as any[]}/>
     </div>}
   </section>
  </div>
 </main>;
}

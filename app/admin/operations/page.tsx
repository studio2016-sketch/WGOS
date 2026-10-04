import Link from "next/link";
import {getOperationsBoard,getOperationsReferenceData,listOperationsProjects} from "../../../lib/operations-board";
import NewProjectForm from "./NewProjectForm";
import OperationsBoardClient from "./OperationsBoardClient";
import RecurringRules from "./RecurringRules";
import AdminNav from "../AdminNav";
import {commandAccess} from "../../../lib/authz";
import {listContractExecution} from "../../../lib/contract-execution";
import ContractControlCenter from "./ContractControlCenter";
import {listContractFinance} from "../../../lib/contract-finance";
import ContractFinanceCenter from "./ContractFinanceCenter";
import {listAccountingEntityProfiles} from "../../../lib/accounting-routing";
import AccountingActivationCenter from "./AccountingActivationCenter";
import {listExpenseIntelligence} from "../../../lib/expense-intelligence";
import ExpenseIntelligenceCenter from "./ExpenseIntelligenceCenter";
import {listFinanceExceptions} from "../../../lib/finance-intelligence";
import FinanceExceptionCenter from "./FinanceExceptionCenter";

export default async function OperationsPage({searchParams}:{searchParams:Promise<{project?:string;brand?:string;task?:string}>}){
 const query=await searchParams;const access=await commandAccess();
 const [projectRows,refs,contractExecutionRaw,contractFinanceRaw,accountingProfilesRaw,expenseIntelligenceRaw,financeExceptionsRaw]=await Promise.all([listOperationsProjects(access.identity.auth_user_id,access.isGlobal),getOperationsReferenceData(access.identity.auth_user_id,access.isGlobal),listContractExecution(access.identity.auth_user_id,access.isGlobal),listContractFinance(access.identity.auth_user_id,access.isGlobal),listAccountingEntityProfiles(access.identity.auth_user_id,access.isGlobal),listExpenseIntelligence(access.identity.auth_user_id,access.isGlobal),listFinanceExceptions(access.identity.auth_user_id,access.isGlobal)]);
 let projects:any[]=projectRows as any[];
 const users:any[]=refs.users as any[];
 const brands:any[]=refs.brands as any[];const selectedBrand=brands.some((b:any)=>b.id===query.brand)?String(query.brand):"";if(selectedBrand)projects=projects.filter((p:any)=>p.brand_id===selectedBrand);
 const contractExecution:any=selectedBrand?{...contractExecutionRaw,agreements:contractExecutionRaw.agreements.filter((x:any)=>x.brand_id===selectedBrand),controls:contractExecutionRaw.controls.filter((x:any)=>x.brand_id===selectedBrand),obligations:contractExecutionRaw.obligations.filter((x:any)=>x.brand_id===selectedBrand),deliverables:contractExecutionRaw.deliverables.filter((x:any)=>x.brand_id===selectedBrand),crew:contractExecutionRaw.crew.filter((x:any)=>x.brand_id===selectedBrand),time:contractExecutionRaw.time.filter((x:any)=>x.brand_id===selectedBrand),costs:contractExecutionRaw.costs.filter((x:any)=>x.brand_id===selectedBrand),changes:contractExecutionRaw.changes.filter((x:any)=>x.brand_id===selectedBrand),records:contractExecutionRaw.records.filter((x:any)=>x.brand_id===selectedBrand),crewOptions:contractExecutionRaw.crewOptions.filter((x:any)=>!x.brand_id||x.brand_id===selectedBrand)}:contractExecutionRaw;
 const contractFinance:any=selectedBrand?{...contractFinanceRaw,controls:contractFinanceRaw.controls.filter((x:any)=>x.brand_id===selectedBrand),vendors:contractFinanceRaw.vendors.filter((x:any)=>x.brand_id===selectedBrand),purchaseOrders:contractFinanceRaw.purchaseOrders.filter((x:any)=>x.brand_id===selectedBrand),financial:contractFinanceRaw.financial.filter((x:any)=>x.brand_id===selectedBrand),syncQueue:contractFinanceRaw.syncQueue.filter((x:any)=>x.brand_id===selectedBrand)}:contractFinanceRaw;
 const accountingProfiles:any[]=selectedBrand?(accountingProfilesRaw as any[]).filter((x:any)=>x.brand_id===selectedBrand):(accountingProfilesRaw as any[]);
 const expenseIntelligence:any=selectedBrand?{...expenseIntelligenceRaw,brands:expenseIntelligenceRaw.brands.filter((x:any)=>x.id===selectedBrand),claims:expenseIntelligenceRaw.claims.filter((x:any)=>x.brand_id===selectedBrand),mileage:expenseIntelligenceRaw.mileage.filter((x:any)=>x.brand_id===selectedBrand),budgets:expenseIntelligenceRaw.budgets.filter((x:any)=>x.brand_id===selectedBrand),rules:expenseIntelligenceRaw.rules.filter((x:any)=>x.brand_id===selectedBrand),forecast:expenseIntelligenceRaw.forecast.filter((x:any)=>x.brand_id===selectedBrand),bankInbox:expenseIntelligenceRaw.bankInbox.filter((x:any)=>x.brand_id===selectedBrand),contracts:expenseIntelligenceRaw.contracts.filter((x:any)=>x.brand_id===selectedBrand),projects:expenseIntelligenceRaw.projects.filter((x:any)=>x.brand_id===selectedBrand)}:expenseIntelligenceRaw;
 const financeExceptions:any=selectedBrand?{...financeExceptionsRaw,brands:financeExceptionsRaw.brands.filter((x:any)=>x.id===selectedBrand),alerts:financeExceptionsRaw.alerts.filter((x:any)=>x.brand_id===selectedBrand),transactions:financeExceptionsRaw.transactions.filter((x:any)=>x.brand_id===selectedBrand),suggestions:financeExceptionsRaw.suggestions.filter((x:any)=>x.brand_id===selectedBrand)}:financeExceptionsRaw;
 let selectedId=query.project||projects[0]?.id||"";
 const totalTasks=projects.reduce((n:number,p:any)=>n+Number(p.task_count||0),0);
 const doneTasks=projects.reduce((n:number,p:any)=>n+Number(p.done_count||0),0);
 const blockedTasks=projects.reduce((n:number,p:any)=>n+Number(p.blocked_count||0),0);
 const overdueTasks=projects.reduce((n:number,p:any)=>n+Number(p.overdue_count||0),0);
 const portfolioProgress=totalTasks?Math.round(doneTasks/totalTasks*100):0;
 const deliveryDecisions=projects.filter((p:any)=>Number(p.blocked_count||0)>0||Number(p.overdue_count||0)>0).sort((a:any,b:any)=>(Number(b.blocked_count||0)+Number(b.overdue_count||0))-(Number(a.blocked_count||0)+Number(a.overdue_count||0)));
 let board:any=selectedId?await getOperationsBoard(String(selectedId),access.identity.auth_user_id,access.isGlobal):null;
 if(!board&&projects.length&&selectedId!==projects[0].id){
  selectedId=projects[0].id;
  board=await getOperationsBoard(String(selectedId),access.identity.auth_user_id,access.isGlobal);
 }

 return <main className="admin">
  <AdminNav active="operations" brands={brands} brand={selectedBrand}/>
  <header className="adminHead commandHero">
   <div><p className="eyebrow">WGOS · OPERATIONS</p><h1>Delivery Command</h1><p>Projects, deliverables, dependencies, ownership, approvals and deadlines in one native workspace.</p><div className="heroSignals"><span>● {projects.length} PROJECTS</span><span>◈ {blockedTasks} BLOCKED</span><span>↗ {portfolioProgress}% COMPLETE</span></div></div>
   <div className="adminActions"><Link href={selectedBrand?"/admin?brand="+encodeURIComponent(selectedBrand):"/admin"}>Commercial Command →</Link><NewProjectForm brands={brands} users={users}/></div>
  </header>

  <section className="opsPulse"><article><small>ACTIVE PROJECTS</small><strong>{projects.length}</strong><span>current portfolio</span></article><article><small>PORTFOLIO PROGRESS</small><strong>{portfolioProgress}%</strong><span>{doneTasks} of {totalTasks} tasks complete</span></article><article><small>BLOCKED</small><strong>{blockedTasks}</strong><span>{blockedTasks?"needs intervention":"clear"}</span></article><article><small>OVERDUE</small><strong>{overdueTasks}</strong><span>{overdueTasks?"needs movement":"on schedule"}</span></article></section>

  <section className="adminPanel deliveryDecisionQueue"><div className="attentionIntro"><p className="eyebrow">DELIVERY AUTOPILOT · EXCEPTIONS</p><h2>{deliveryDecisions.length?deliveryDecisions.length+" project"+(deliveryDecisions.length===1?"":"s")+" need intervention":"Delivery is operating cleanly"}</h2><p>{deliveryDecisions.length?"WGOS is suppressing routine delivery noise and surfacing the projects with blocked or overdue work.":"No blocked or overdue project work is currently competing for executive attention."}</p></div><div className="deliveryDecisionList">{deliveryDecisions.slice(0,5).map((p:any)=><Link key={"decision-"+p.id} href={"/admin/operations?project="+encodeURIComponent(p.id)+(selectedBrand?"&brand="+encodeURIComponent(selectedBrand):"")} className="deliveryDecisionItem"><span>{p.brand_name}</span><strong>{p.title}</strong><small>{Number(p.blocked_count||0)} blocked · {Number(p.overdue_count||0)} overdue</small><b>Resolve →</b></Link>)}</div></section>

  <ContractControlCenter data={contractExecution} users={users}/>
  <ContractFinanceCenter data={contractFinance}/>
  <AccountingActivationCenter profiles={accountingProfiles}/>
  <ExpenseIntelligenceCenter data={expenseIntelligence}/>
  <FinanceExceptionCenter data={financeExceptions}/>

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
      <OperationsBoardClient initialProject={board.project as any} initialTasks={board.tasks as any[]} dependencies={board.dependencies as any[]} users={board.users as any[]} initialComments={board.comments as any[]} initialTaskId={query.task||""}/>
      <RecurringRules projectId={String(board.project.id)} users={board.users as any[]} initial={board.recurringRules as any[]}/>
     </div>}
   </section>
  </div>
 </main>;
}

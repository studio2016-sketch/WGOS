"use client";

import {useMemo,useRef,useState} from "react";

const statuses=["OPEN","IN_PROGRESS","WAITING","BLOCKED","DONE"];
const localValue=(value:any)=>{if(!value)return "";const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}T${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;};
const toIso=(value:any)=>value?new Date(String(value)).toISOString():null;

export default function ShowPrepClient({brandId,events,users,deliverables,runItems}:{brandId:string;events:any[];users:any[];deliverables:any[];runItems:any[]}){
 const [rows,setRows]=useState(events),[tasks,setTasks]=useState(deliverables),[cues,setCues]=useState(runItems),[selected,setSelected]=useState(events[0]?.id||""),[message,setMessage]=useState(""),[saving,setSaving]=useState<string|null>(null);
 const creating=useRef(false);
 const [createBusy,setCreateBusy]=useState(false),[createError,setCreateError]=useState("");
 const current=rows.find(e=>String(e.id)===String(selected));
 const currentTasks=useMemo(()=>tasks.filter(t=>String(t.production_event_id)===String(selected)),[tasks,selected]);
 const currentCues=useMemo(()=>cues.filter(c=>String(c.production_event_id)===String(selected)),[cues,selected]);
 async function create(form:FormData){
  if(creating.current)return;
  creating.current=true;setCreateBusy(true);setMessage("");setCreateError("");
  try{
   const body:Record<string,any>=Object.fromEntries(form);
   for(const key of ["eventStart","loadInAt","doorsAt"])body[key]=toIso(body[key]);
   body.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||"America/Chicago";
   const r=await fetch("/api/admin/show-prep",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const data=await r.json();if(!r.ok)throw new Error(data.error||"Unable to create show");
   setRows(current=>[data.event,...current]);setTasks(current=>[...data.deliverables,...current]);setSelected(data.event.id);
   setMessage(`Show saved with ${data.deliverables.length} prep deliverables. Next, assign owners and review the checklist below.`);
  }catch(error){setCreateError(error instanceof Error?error.message:"Unable to save show. Check the show list before retrying.");}
  finally{creating.current=false;setCreateBusy(false);}
 }

 async function saveTask(task:any){setSaving(task.id);setMessage("");const r=await fetch("/api/admin/show-prep/deliverables",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({...task,due_at:toIso(task.due_at)})});const data=await r.json();setSaving(null);if(!r.ok){setMessage(data.error||"Unable to save deliverable");return}setTasks(tasks.map(t=>t.id===task.id?data.deliverable:t));setMessage("Deliverable saved.");}
 async function addTask(form:FormData){setMessage("");const r=await fetch("/api/admin/show-prep/deliverables",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productionEventId:selected,checkpoint:form.get("checkpoint"),dueAt:toIso(form.get("dueAt")),ownerSubject:form.get("ownerSubject"),notes:form.get("notes")})});const data=await r.json();if(!r.ok){setMessage(data.error||"Unable to add deliverable");return}setTasks([data.deliverable,...tasks]);setMessage("Deliverable added.");}
 async function addCue(form:FormData){setMessage("");const r=await fetch("/api/admin/show-prep/run-of-show",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productionEventId:selected,title:form.get("title"),cueAt:toIso(form.get("cueAt")),durationSeconds:form.get("durationSeconds"),department:form.get("department"),ownerSubject:form.get("ownerSubject"),notes:form.get("notes")})});const data=await r.json();if(!r.ok){setMessage(data.error||"Unable to add schedule item");return}setCues([...cues,data.item]);setMessage("Schedule item added.");}
 async function saveCue(item:any){setSaving(item.id);const r=await fetch("/api/admin/show-prep/run-of-show",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({...item,cue_at:toIso(item.cue_at)})});const data=await r.json();setSaving(null);if(!r.ok){setMessage(data.error||"Unable to save schedule item");return}setCues(cues.map(c=>c.id===item.id?data.item:c));setMessage("Schedule item saved.");}
 return <section className="adminPanel showPrepWorkspace">
  <h2>Save a show date</h2>
  <p>Enter the show details to save its production plan and generate a prep checklist. This does not confirm a client booking.</p>
  <form onSubmit={event=>{event.preventDefault();void create(new FormData(event.currentTarget));}} className="showDateForm" aria-busy={createBusy}>
   <input type="hidden" name="brandId" value={brandId}/>
   <label>Show / artist<input name="eventName" required placeholder="Show or artist name"/></label>
   <label>Venue / room<input name="venueName" placeholder="Venue or room, if known"/></label>
   <label>Show date and time<input name="eventStart" type="datetime-local" required/></label>
   <label>Load-in date and time (optional)<input name="loadInAt" type="datetime-local"/></label>
   <label>Doors open (optional)<input name="doorsAt" type="datetime-local"/></label>
   <p className="showFormFull">Times use your device’s local time zone.</p>
   <button type="submit" className="primary showSaveButton showFormFull" disabled={createBusy}>{createBusy?"Saving show…":"Save show & create checklist"}</button>
  </form>
  {createError&&<p role="alert">{createError}</p>}
  {message&&<p role="status">{message}</p>}

  <div className="workspaceTitle"><div><p className="eyebrow">UPCOMING & RECENT SHOWS</p><h2>Production events</h2><p className="muted">{rows.length} events · {users.length} active WGOS users available for assignment</p></div></div>
  {rows.length===0?<div className="emptyAttention"><h3>No Studio2016 production events yet</h3><p>Create a show above to generate its checklist.</p></div>:<>
   <label style={{display:"grid",gap:6,maxWidth:620,margin:"18px 0"}}>Show<select value={selected} onChange={e=>setSelected(e.target.value)}>{rows.map(e=><option key={e.id} value={e.id}>{e.event_name} · {e.venue_name||"Venue TBD"} · {e.event_start?new Date(e.event_start).toLocaleDateString():"Date TBD"}</option>)}</select></label>
   {current&&<><div style={{padding:"12px 0"}}><h3>{current.event_name}</h3><p className="muted">{current.venue_name||"Venue not set"} · {current.event_start?new Date(current.event_start).toLocaleString():"Date not set"} · Load-in {current.load_in_at?new Date(current.load_in_at).toLocaleString():"TBD"} · Doors {current.doors_at?new Date(current.doors_at).toLocaleString():"TBD"}</p><p><a href="#show-checklist">Review prep checklist</a>{current.project_id&&<> · <a href={"/admin/operations?project="+encodeURIComponent(current.project_id)}>Open show project</a></>}</p></div>
   <form action={addTask} style={{display:"grid",gridTemplateColumns:"minmax(220px,2fr) repeat(2,minmax(160px,1fr)) auto",gap:8,margin:"12px 0 20px"}}><input name="checkpoint" required placeholder="Add a deliverable"/><input name="dueAt" type="datetime-local" aria-label="Due date"/><select name="ownerSubject"><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email}</option>)}</select><button className="primary showSaveButton">Add</button></form>
   <div className="workspaceTitle" style={{marginTop:28}}><div><p className="eyebrow">ADVANCE CHECKLIST</p><h3 id="show-checklist" tabIndex={-1}>Production deliverables</h3><p className="muted">{currentTasks.filter(t=>t.status==="DONE").length} of {currentTasks.length} complete · {currentTasks.filter(t=>t.status==="BLOCKED").length} blocked</p></div></div>
   {currentTasks.length===0?<p className="muted">No deliverables for this show yet.</p>:<div style={{display:"grid",gap:12}}>{currentTasks.map(t=><TaskEditor key={t.id} task={t} users={users} saving={saving===t.id} onSave={saveTask}/>)}</div>}
   <div className="workspaceTitle" style={{marginTop:34}}><div><p className="eyebrow">SHOW DAY</p><h3>Run of show</h3><p className="muted">Editable cue times, durations, departments, and owners.</p></div></div>
   <form action={addCue} style={{display:"grid",gridTemplateColumns:"minmax(200px,2fr) repeat(3,minmax(130px,1fr)) auto",gap:8,margin:"12px 0 20px"}}><input name="title" required placeholder="Cue / schedule item"/><input name="cueAt" type="datetime-local" aria-label="Cue time"/><input name="durationSeconds" type="number" min="0" placeholder="Duration (sec)"/><input name="department" placeholder="Department"/><select name="ownerSubject"><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email}</option>)}</select><button className="primary showSaveButton">Add cue</button></form>
   {currentCues.length===0?<p className="muted">No run-of-show cues yet.</p>:<div style={{display:"grid",gap:12}}>{currentCues.map(c=><CueEditor key={c.id} item={c} users={users} saving={saving===c.id} onSave={saveCue}/>)}</div>}
  </>}
  </>}
  <style jsx global>{`
   .showPrepWorkspace{min-width:0;padding-bottom:24px!important}
   .showPrepWorkspace .showDateForm{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:16px;margin:20px 0 24px}
   .showPrepWorkspace label{display:grid;gap:8px;min-width:0;font-size:1rem;letter-spacing:normal}
   .showPrepWorkspace input,.showPrepWorkspace select,.showPrepWorkspace textarea{box-sizing:border-box;min-width:0;max-width:100%;font-size:1rem}
   .showPrepWorkspace .showSaveButton{display:block;min-height:48px;font-size:1rem;font-weight:700}
   .showPrepWorkspace .showFormFull{grid-column:1 / -1;margin:0}
   .showPrepWorkspace #show-checklist{scroll-margin-top:180px}
   @media(max-width:800px){
    .showPrepWorkspace form,.showPrepWorkspace article{grid-template-columns:minmax(0,1fr)!important}
    .showPrepWorkspace input[type="datetime-local"]{width:100%;appearance:none;-webkit-appearance:none}
   }
  `}</style>
 </section>;
}

function CueEditor({item,users,saving,onSave}:{item:any;users:any[];saving:boolean;onSave:(item:any)=>void}){
 const [draft,setDraft]=useState({...item,cue_at:localValue(item.cue_at)});
 function change(key:string,value:any){setDraft({...draft,[key]:value});}
 return <article style={{padding:14,border:"1px solid rgba(255,255,255,.14)",borderRadius:12,display:"grid",gridTemplateColumns:"minmax(200px,2fr) repeat(4,minmax(130px,1fr)) auto",gap:8,alignItems:"center"}}>
  <input aria-label="Cue title" value={draft.title} onChange={e=>change("title",e.target.value)}/><input aria-label="Cue time" type="datetime-local" value={draft.cue_at} onChange={e=>change("cue_at",e.target.value)}/><input aria-label="Duration seconds" type="number" min="0" value={draft.duration_seconds||""} onChange={e=>change("duration_seconds",e.target.value?Number(e.target.value):null)}/><input aria-label="Department" value={draft.department||""} onChange={e=>change("department",e.target.value||null)}/><select aria-label="Cue owner" value={draft.owner_subject||""} onChange={e=>change("owner_subject",e.target.value||null)}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email}</option>)}</select><button className="primary showSaveButton" disabled={saving||!draft.title.trim()} onClick={()=>onSave(draft)}>{saving?"Saving…":"Save"}</button>
  <textarea aria-label="Cue notes" placeholder="Cue notes" value={draft.notes||""} onChange={e=>change("notes",e.target.value)} style={{gridColumn:"1 / -1",minHeight:54}}/>
 </article>;
}

function TaskEditor({task,users,saving,onSave}:{task:any;users:any[];saving:boolean;onSave:(task:any)=>void}){
 const [draft,setDraft]=useState({...task,due_at:localValue(task.due_at)});
 function change(key:string,value:any){setDraft({...draft,[key]:value});}
 return <article style={{padding:14,border:"1px solid rgba(255,255,255,.14)",borderRadius:12,display:"grid",gridTemplateColumns:"minmax(220px,2fr) repeat(3,minmax(140px,1fr)) auto",gap:8,alignItems:"center"}}>
  <input aria-label="Deliverable" value={draft.checkpoint} onChange={e=>change("checkpoint",e.target.value)}/><select aria-label="Owner" value={draft.owner_subject||""} onChange={e=>change("owner_subject",e.target.value||null)}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email}</option>)}</select><input aria-label="Due date" type="datetime-local" value={draft.due_at} onChange={e=>change("due_at",e.target.value)}/><select aria-label="Status" value={draft.status||"OPEN"} onChange={e=>change("status",e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select><button className="primary showSaveButton" disabled={saving||!draft.checkpoint.trim()} onClick={()=>onSave(draft)}>{saving?"Saving…":"Save"}</button>
  <textarea aria-label="Notes" placeholder="Notes / handoff" value={draft.notes||""} onChange={e=>change("notes",e.target.value)} style={{gridColumn:"1 / -1",minHeight:54}}/>
 </article>;
}

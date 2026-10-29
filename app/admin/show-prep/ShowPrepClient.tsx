"use client";

import {useMemo,useState} from "react";

const statuses=["OPEN","IN_PROGRESS","WAITING","BLOCKED","DONE"];
const localValue=(value:any)=>value?new Date(value).toISOString().slice(0,16):"";

export default function ShowPrepClient({brandId,events,users,deliverables}:{brandId:string;events:any[];users:any[];deliverables:any[]}){
 const [rows,setRows]=useState(events),[tasks,setTasks]=useState(deliverables),[selected,setSelected]=useState(events[0]?.id||""),[message,setMessage]=useState(""),[saving,setSaving]=useState<string|null>(null);
 const current=rows.find(e=>String(e.id)===String(selected));
 const currentTasks=useMemo(()=>tasks.filter(t=>String(t.production_event_id)===String(selected)),[tasks,selected]);
 async function create(form:FormData){setMessage("");const r=await fetch("/api/admin/show-prep",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(Object.fromEntries(form))});const data=await r.json();if(!r.ok){setMessage(data.error||"Unable to create show");return}setRows([data.event,...rows]);setTasks([...data.deliverables,...tasks]);setSelected(data.event.id);setMessage(`Show created with ${data.deliverables.length} prep deliverables.`);}
 async function saveTask(task:any){setSaving(task.id);setMessage("");const r=await fetch("/api/admin/show-prep/deliverables",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(task)});const data=await r.json();setSaving(null);if(!r.ok){setMessage(data.error||"Unable to save deliverable");return}setTasks(tasks.map(t=>t.id===task.id?data.deliverable:t));setMessage("Deliverable saved.");}
 async function addTask(form:FormData){setMessage("");const r=await fetch("/api/admin/show-prep/deliverables",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productionEventId:selected,checkpoint:form.get("checkpoint"),dueAt:form.get("dueAt"),ownerSubject:form.get("ownerSubject"),notes:form.get("notes")})});const data=await r.json();if(!r.ok){setMessage(data.error||"Unable to add deliverable");return}setTasks([data.deliverable,...tasks]);setMessage("Deliverable added.");}
 return <section className="adminPanel">
  <form action={create} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:22}}><input type="hidden" name="brandId" value={brandId}/><input name="eventName" required placeholder="Show / artist"/><input name="venueName" placeholder="Venue / room"/><input name="eventStart" type="datetime-local" aria-label="Show date and time"/><input name="loadInAt" type="datetime-local" aria-label="Load-in"/><input name="doorsAt" type="datetime-local" aria-label="Doors"/><button className="newAction">Create show + checklist</button></form>
  <div className="workspaceTitle"><div><p className="eyebrow">UPCOMING & RECENT SHOWS</p><h2>Production events</h2><p className="muted">{rows.length} events · {users.length} active WGOS users available for assignment</p></div></div>
  {rows.length===0?<div className="emptyAttention"><h3>No Studio2016 production events yet</h3><p>Create a show above to generate its checklist.</p></div>:<>
   <label style={{display:"grid",gap:6,maxWidth:620,margin:"18px 0"}}>Show<select value={selected} onChange={e=>setSelected(e.target.value)}>{rows.map(e=><option key={e.id} value={e.id}>{e.event_name} · {e.venue_name||"Venue TBD"} · {e.event_start?new Date(e.event_start).toLocaleDateString():"Date TBD"}</option>)}</select></label>
   {current&&<><div style={{padding:"12px 0"}}><h3>{current.event_name}</h3><p className="muted">{current.venue_name||"Venue not set"} · {current.event_start?new Date(current.event_start).toLocaleString():"Date not set"} · Load-in {current.load_in_at?new Date(current.load_in_at).toLocaleString():"TBD"} · Doors {current.doors_at?new Date(current.doors_at).toLocaleString():"TBD"}</p></div>
   <form action={addTask} style={{display:"grid",gridTemplateColumns:"minmax(220px,2fr) repeat(2,minmax(160px,1fr)) auto",gap:8,margin:"12px 0 20px"}}><input name="checkpoint" required placeholder="Add a deliverable"/><input name="dueAt" type="datetime-local" aria-label="Due date"/><select name="ownerSubject"><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email}</option>)}</select><button className="newAction">Add</button></form>
   {currentTasks.length===0?<p className="muted">No deliverables for this show yet.</p>:<div style={{display:"grid",gap:12}}>{currentTasks.map(t=><TaskEditor key={t.id} task={t} users={users} saving={saving===t.id} onSave={saveTask}/>)}</div>}</>}
  </>}
  {message&&<p role="status" style={{marginTop:14}}>{message}</p>}
 </section>;
}

function TaskEditor({task,users,saving,onSave}:{task:any;users:any[];saving:boolean;onSave:(task:any)=>void}){
 const [draft,setDraft]=useState({...task,due_at:localValue(task.due_at)});
 function change(key:string,value:any){setDraft({...draft,[key]:value});}
 return <article style={{padding:14,border:"1px solid rgba(255,255,255,.14)",borderRadius:12,display:"grid",gridTemplateColumns:"minmax(220px,2fr) repeat(3,minmax(140px,1fr)) auto",gap:8,alignItems:"center"}}>
  <input aria-label="Deliverable" value={draft.checkpoint} onChange={e=>change("checkpoint",e.target.value)}/><select aria-label="Owner" value={draft.owner_subject||""} onChange={e=>change("owner_subject",e.target.value||null)}><option value="">Unassigned</option>{users.map(u=><option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name||u.email}</option>)}</select><input aria-label="Due date" type="datetime-local" value={draft.due_at} onChange={e=>change("due_at",e.target.value)}/><select aria-label="Status" value={draft.status||"OPEN"} onChange={e=>change("status",e.target.value)}>{statuses.map(s=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select><button className="newAction" disabled={saving||!draft.checkpoint.trim()} onClick={()=>onSave(draft)}>{saving?"Saving…":"Save"}</button>
  <textarea aria-label="Notes" placeholder="Notes / handoff" value={draft.notes||""} onChange={e=>change("notes",e.target.value)} style={{gridColumn:"1 / -1",minHeight:54}}/>
 </article>;
}

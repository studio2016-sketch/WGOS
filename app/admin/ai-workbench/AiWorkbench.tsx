'use client';

import {useState} from 'react';
import {buildBrief,emptyBrief,limits,prepareModelPrompt,workflows,type BriefInput,type Workflow} from '../../../lib/ai-workbench';
import styles from './workbench.module.css';

const modes=Object.keys(workflows) as Workflow[];
const requestLabel:Record<Workflow,string>={status:'Decision or question',followup:'One request to the buyer',campaign:'Campaign objective or action'};
export default function AiWorkbench(){
 const [mode,setMode]=useState<Workflow>('status');
 const [briefInput,setBriefInput]=useState(emptyBrief);
 const [result,setResult]=useState<ReturnType<typeof buildBrief>|null>(null);
 const [reviewed,setReviewed]=useState(false);
 const [prompt,setPrompt]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 function update<K extends keyof BriefInput>(key:K,value:BriefInput[K]){
  const resetsClearance=key==='business'||key==='topic'||key==='audience'||key==='request'||key==='evidence'||key==='clearedAssets';
  setBriefInput(current=>({...current,...(resetsClearance?{assetClearance:false}:{}),[key]:value}));
  setResult(null);setReviewed(false);setPrompt(null);setNotice('');
 }
 function choose(next:Workflow){
  if(next===mode)return;
  // Avoid silently reusing another workflow's context, recipients or assets.
  setMode(next);setBriefInput(emptyBrief());setResult(null);setReviewed(false);setPrompt(null);setNotice('Switched workflow. Start a new worksheet below.');
 }
 function reset(){
  setBriefInput(emptyBrief());setResult(null);setReviewed(false);setPrompt(null);setNotice('Worksheet cleared.');
 }
 function showDraft(){
  setResult(buildBrief(mode,briefInput));setNotice('Internal draft generated below. Nothing was sent or saved.');
 }
 function field(key:Exclude<keyof BriefInput,'assetClearance'>,label:string,placeholder:string,max=limits.short,multiline=false){
  return <label className={styles.field}>
   <span>{label}</span>
   {multiline?<textarea autoComplete="off" spellCheck={false} rows={4} maxLength={max} value={briefInput[key]} placeholder={placeholder} onChange={e=>update(key,e.target.value)}/>:
   <input autoComplete="off" spellCheck={false} maxLength={max} value={briefInput[key]} placeholder={placeholder} onChange={e=>update(key,e.target.value)}/>}
  </label>;
 }
 return <div className={styles.workbench}>
  <section className={`adminPanel ${styles.panel}`} aria-labelledby="workflow-title">
   <h2 id="workflow-title">Pick a workflow</h2>
   <p className={styles.boundary}><strong>No model connected.</strong> This creates a draft in this tab using templates, not AI. It is not synced or saved to WGOS. No business records are pulled in. Reloading or switching workflows clears this worksheet.</p>
   <fieldset className={styles.modes}><legend className={styles.srOnly}>Workflow (switching clears entries)</legend>{modes.map(key=><label className={styles.mode} key={key}>
    <input type="radio" name="ai-workflow" checked={mode===key} onChange={()=>choose(key)}/>
    <span><small>{workflows[key].domain}</small><strong>{workflows[key].label}</strong><span>{workflows[key].description}</span></span>
   </label>)}</fieldset>
  </section>
  <section className={`adminPanel ${styles.panel}`} aria-labelledby="input-title">
   <h2 id="input-title">{workflows[mode].label}</h2>
   <p>Use one business at a time. Enter only facts you can support, and use short source labels rather than full customer or vendor records. Do not enter personal details, sensitive terms or credentials.</p>
   <div className={styles.fields}>
    {field('business','Business / internal label','Use a generic label')}
    {field('topic','Topic','What is this about?')}
    {field('audience','Audience','e.g., internal reviewer or procurement team')}
    {field('voice','Voice','e.g., concise, warm, direct')}
    {field('facts','Verified facts (one per line)','Only facts you have independently checked.',limits.notes,true)}
    {field('gaps','Unknowns or blockers (one per line)','What still needs checking or a decision?',limits.notes,true)}
    {field('evidence','Internal evidence labels (one per line)','e.g., approved scope revision or rights review ID; not links.',limits.notes,true)}
    {field('request',requestLabel[mode],'State one decision, ask or goal.',limits.line,true)}
   </div>
   {mode==='campaign'&&<fieldset className={styles.subset}><legend>Cleared source assets</legend>
    {field('clearedAssets','Asset descriptions (one per line)','Use only asset labels, not files or personal details.',limits.notes,true)}
    <label className={styles.check}><input type="checkbox" checked={briefInput.assetClearance} onChange={e=>update('assetClearance',e.target.checked)}/>I checked that these assets are cleared for this audience and intended use, and entered the rights evidence above.</label>
   </fieldset>}
   <fieldset className={styles.subset}><legend>Next step and review</legend>
    <div className={styles.fields}>
     {field('nextTask','Next task','One concrete step',limits.line)}
     {field('taskOwner','Task owner','Use a role, not a name')}
     {field('due','Due or review checkpoint','e.g., Friday planning review')}
     {field('reviewer','Reviewer','Who can approve the final result? Use a role.')}
    </div>
   </fieldset>
   <div className={styles.actions}><button type="button" onClick={showDraft}>Build internal draft</button><button type="button" onClick={reset}>Clear worksheet</button></div>
   <p role="status" className={styles.status}>{notice}</p>
  </section>
  {result&&<section className={`adminPanel ${styles.panel}`} aria-labelledby="draft-title">
   <h2 id="draft-title">Internal draft and checks</h2>
   {result.missing.length>0?<p className={styles.boundary}><strong>Still missing:</strong> {result.missing.join(', ')}. Do not rely on this as ready to send or publish.</p>:<p className={styles.boundary}>Required inputs are present. This is still a draft and has not been approved.</p>}
   <label className={styles.field}><span>Internal draft with notes and review checklist</span><textarea readOnly rows={12} value={result.brief}/></label>
   {result.messageDraft&&<label className={styles.field}><span>Buyer copy to review separately (not sent)</span><textarea readOnly rows={8} value={result.messageDraft}/></label>}
   <details className={styles.copy}>
    <summary>Optional: prepare a separate model prompt</summary>
    <p>Nothing here is sent to a model. Only use a separately approved service and scope. Basic masking is not proof of redaction; verify the entire prompt before you manually copy anything.</p>
    <label className={styles.check}><input type="checkbox" checked={reviewed} onChange={e=>{setReviewed(e.target.checked);setPrompt(null);}}/>I reviewed the entered content for this use and removed private, identifying and restricted details.</label>
    <div className={styles.actions}><button type="button" disabled={!reviewed} onClick={()=>setPrompt(prepareModelPrompt(mode,briefInput,reviewed))}>Show model prompt</button></div>
    {prompt&&<label className={styles.field}><span>Model prompt (select and copy manually only if approved)</span><textarea readOnly rows={10} value={prompt}/></label>}
   </details>
  </section>}
 </div>;
}

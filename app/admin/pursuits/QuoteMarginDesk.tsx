'use client';

import {useState} from 'react';
import {
 calculateQuote,emptyQuoteCosts,emptyReadiness,quoteCostCategories,readinessChecks,summarizeReadiness,
 type QuoteCosts,type Readiness,
} from '../../../lib/quote-margin';
import styles from './quote-margin.module.css';

const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const pct=new Intl.NumberFormat('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
const money=(cents:number|null)=>cents===null?'—':usd.format(cents/100);
const percent=(value:number|null)=>value===null?'Not defined at zero revenue':`${pct.format(value)}%`;

function Costs({group,values,update,invalid}:{group:'Estimate'|'Actual';values:QuoteCosts;update:(next:QuoteCosts)=>void;invalid:readonly string[]}){
 return <div className={styles.costs}>
  {quoteCostCategories.map(({id,label,hint})=><label key={id} className={styles.field}>
   <span>{label} (USD)</span>
   {group==='Estimate'&&<small>{hint}</small>}
   <input type="text" inputMode="decimal" maxLength={10} placeholder="Unknown" spellCheck={false} aria-invalid={invalid.includes(id)} value={values[id]} onChange={e=>update({...values,[id]:e.target.value})}/>
  </label>)}
 </div>;
}

export default function QuoteMarginDesk(){
 const [job,setJob]=useState('');
 const [scope,setScope]=useState('');
 const [estimateBasis,setEstimateBasis]=useState('');
 const [actualBasis,setActualBasis]=useState('');
 const [estimateCosts,setEstimateCosts]=useState(emptyQuoteCosts);
 const [actualCosts,setActualCosts]=useState(emptyQuoteCosts);
 const [targetMargin,setTargetMargin]=useState('');
 const [plannedPrice,setPlannedPrice]=useState('');
 const [actualRevenue,setActualRevenue]=useState('');
 const [actualStatus,setActualStatus]=useState<'open'|'reconciled'>('open');
 const [readiness,setReadiness]=useState(emptyReadiness);
 const readinessStatus=summarizeReadiness(readiness);
 const math=calculateQuote({
  estimateCosts,targetMargin,plannedPrice,actualCosts,actualRevenue,
  actualStatus:actualStatus==='reconciled'&&actualBasis.trim()?'reconciled':'open',
 });
 const estimateHasBasis=Boolean(job.trim()&&scope.trim()&&estimateBasis.trim());
 const stats = [
  {label:'Entered cost estimate',value:money(math.estimateCosts.totalCents)},
  {label:'Target price floor',value:money(math.floorCents)},
  {label:'Estimated contribution',value:money(math.estimated?.contributionCents??null),note:math.estimated?percent(math.estimated.marginPct):'Enter a planned price and all estimated costs.'},
  {label:'Actual contribution',value:money(math.actual?.contributionCents??null),note:math.actual?percent(math.actual.marginPct):'Complete and reconcile the actuals first.'},
  {label:'Actual minus estimate',value:money(math.varianceCents),note:'Contribution difference, not revenue difference.'},
 ];
 const draftText = [
  'STUDIO2016 | INTERNAL DRAFT — NOT A CLIENT QUOTE',
  'No approval or sending; USD excluding collected sales tax.',
  `Job: ${job.trim()||'Unspecified'}`,
  `Scope: ${scope.trim()||'Undocumented'}`,
  `Estimate references: ${estimateBasis.trim()||'Undocumented'}`,
  `Planned price: ${math.estimatePrice.state==='valid'?money(math.estimatePrice.value):'Unknown'}`,
  `Target margin: ${math.targetMargin.state==='valid'?percent(math.targetMargin.value/100):'Unknown'}`,
  `Estimate cost lines missing: ${math.estimateCosts.missing.length}; invalid: ${math.estimateCosts.invalid.length}`,
  ...(math.actual?[`Actuals reconciled manually; references: ${actualBasis.trim()}`]:['Actuals: unreconciled or incomplete']),
  ...stats.map(({label,value,note})=>`${label}: ${value}${value!=='—'&&note?` (${note})`:''}`),
  ...(math.belowTarget?['Warning: planned price is below target.']:[]),
  `Readiness: ${readinessStatus}; manual evidence only.`,
  ...readinessChecks.map(({id,label})=>`${label}: ${readiness[id].status} — ${readiness[id].reference.trim()||'No reference'}`),
 ].join('\n');
 function setCheck<K extends keyof Readiness>(id:K,update:Partial<Readiness[K]>){
  setReadiness(prev=>({...prev,[id]:{...prev[id],...update}}));
 }
 return <section id="quote-margin-desk" aria-labelledby="quote-margin-title" className={`adminPanel ${styles.desk}`}>
  <header className={styles.header}>
   <div><p className="eyebrow">STUDIO2016 / COMMERCIAL WORKBENCH</p><h2 id="quote-margin-title">Quote &amp; margin desk</h2><p>Price a proposed job, then compare the estimate with reconciled actuals. No quote is sent, approved or saved here.</p></div>
   <span className={styles.badge}>Internal draft only</span>
  </header>
  <p className={styles.notice}>This worksheet stays in this tab and clears on reload or navigation. Use short internal reference IDs, not contact details, credentials or sensitive document contents.</p>
  <fieldset className={styles.fieldset}>
   <legend>1. Define the job</legend>
   <div className={styles.details}>
    <label className={styles.field}><span>Job or pursuit reference</span><input value={job} onChange={e=>setJob(e.target.value)} maxLength={90} placeholder="e.g. internal pursuit ID"/></label>
    <label className={styles.field}><span>Estimate sources</span><input value={estimateBasis} onChange={e=>setEstimateBasis(e.target.value)} maxLength={180} placeholder="e.g. scope rev 2, supplier ref Q-104"/></label>
    <label className={`${styles.field} ${styles.wide}`}><span>Scope, dates &amp; exclusions</span><textarea rows={2} maxLength={600} value={scope} onChange={e=>setScope(e.target.value)} placeholder="What is delivered, when, and what is not included?"/></label>
   </div>
  </fieldset>
  <div className={styles.columns}>
   <fieldset className={styles.fieldset}>
    <legend>2. Build the estimate</legend>
    <p className={styles.help}>Leave unknown amounts blank. Use 0 only if verified to be no cost. Enter amounts without dollar signs or commas; exclude collected sales tax.</p>
    <Costs group="Estimate" values={estimateCosts} update={setEstimateCosts} invalid={math.estimateCosts.invalid}/>
    <div className={styles.details}>
     <label className={styles.field}><span>Target margin (%)</span><small>Contribution as a share of price, not markup.</small><input type="text" inputMode="decimal" maxLength={6} placeholder="e.g. 30" value={targetMargin} aria-invalid={math.targetMargin.state==='invalid'} onChange={e=>setTargetMargin(e.target.value)}/>{math.targetMargin.state==='invalid'&&<small>Enter 0 to 99.99 with up to two decimals.</small>}</label>
     <label className={styles.field}><span>Planned price (USD)</span><small>Enter the proposed amount before sales tax.</small><input type="text" inputMode="decimal" maxLength={10} placeholder="Unknown" value={plannedPrice} aria-invalid={math.estimatePrice.state==='invalid'} onChange={e=>setPlannedPrice(e.target.value)}/>{math.estimatePrice.state==='invalid'&&<small>Enter a positive amount, up to two decimals.</small>}</label>
    </div>
   </fieldset>
   <fieldset className={styles.fieldset}>
    <legend>3. Reconcile actuals</legend>
    <p className={styles.help}>Enter all incurred or payable job costs without counting the same cost twice. Use net cash collected, after refunds and excluding sales tax.</p>
    <Costs group="Actual" values={actualCosts} update={setActualCosts} invalid={math.actualCosts.invalid}/>
    <div className={styles.details}>
     <label className={styles.field}><span>Net cash collected (USD)</span><input type="text" inputMode="decimal" maxLength={10} placeholder="Unknown" value={actualRevenue} aria-invalid={math.actualRevenue.state==='invalid'} onChange={e=>setActualRevenue(e.target.value)}/>{math.actualRevenue.state==='invalid'&&<small>Enter 0 or a positive amount, up to two decimals.</small>}</label>
     <label className={styles.field}><span>Reconciliation status</span><select value={actualStatus} onChange={e=>setActualStatus(e.target.value==='reconciled'?'reconciled':'open')}><option value="open">Open / not yet reconciled</option><option value="reconciled">Reconciled manually</option></select></label>
     <label className={`${styles.field} ${styles.wide}`}><span>Actuals source reference</span><input maxLength={180} value={actualBasis} onChange={e=>setActualBasis(e.target.value)} placeholder="e.g. job ledger ref and closeout date"/></label>
    </div>
   </fieldset>
  </div>
  <div className={styles.result} aria-live="polite" aria-atomic="true">
   <h3>Job economics</h3>
   <dl className={styles.stats}>{stats.map(({label,value,note})=><div key={label}><dt>{label}</dt><dd>{value}</dd>{note&&<dd className={styles.metricNote}>{note}</dd>}</div>)}</dl>
   <div className={styles.messages}>
    {math.estimateCosts.missing.length>0&&<p>Estimate: {math.estimateCosts.missing.length} cost {math.estimateCosts.missing.length===1?'line still blank':'lines still blank'}.</p>}
    {math.actualCosts.missing.length>0&&<p>Actuals: {math.actualCosts.missing.length} cost {math.actualCosts.missing.length===1?'line still blank':'lines still blank'}.</p>}
    {(math.estimateCosts.invalid.length>0||math.actualCosts.invalid.length>0)&&<p>Correct marked costs: use non-negative amounts with at most two decimals and no currency symbols or separators.</p>}
    {!estimateHasBasis&&<p>Document the job, scope and estimate sources before relying on the math.</p>}
    {actualStatus==='reconciled'&&!actualBasis.trim()&&<p>Add an actuals source reference to show reconciled results.</p>}
    {math.estimateCosts.totalCents===0&&<p>No price floor is shown on a zero-cost estimate. Recheck costs and choose a positive planned price.</p>}
    {math.belowTarget&&<p className={styles.warning}>Planned price is below the target margin.</p>}
    {math.estimated&&math.estimated.contributionCents<0&&<p className={styles.warning}>Planned price does not cover entered costs.</p>}
   </div>
  </div>
  <fieldset className={styles.fieldset}>
   <legend>4. Check readiness &amp; capacity</legend>
   <p className={styles.help}>Record what supports each check. Owning gear does not establish its condition, availability or suitability for this job.</p>
   <div className={styles.readiness}>
    {readinessChecks.map(({id,label})=><fieldset className={styles.check} key={id}><legend>{label}</legend>
     <label className={styles.field}><span>Status</span><select value={readiness[id].status} onChange={e=>setCheck(id,{status:e.target.value as Readiness[typeof id]['status']})}>
      <option value="unknown">Unverified</option><option value="confirmed">Confirmed manually</option><option value="blocked">Blocked</option>{id!=='scope'&&<option value="not-applicable">Not applicable</option>}
     </select></label>
     <label className={styles.field}><span>Evidence reference or reason</span><input value={readiness[id].reference} maxLength={180} onChange={e=>setCheck(id,{reference:e.target.value})} placeholder="e.g. inventory check ID, assigned crew"/></label>
    </fieldset>)}
   </div>
   <p className={styles.notice} aria-live="polite">{readinessStatus==='blocked'?'Readiness: blocked. Resolve the marked check before review.':readinessStatus==='documented'?'Readiness: manually documented, not approved.':'Readiness: incomplete. Confirm or explain every check before review.'}</p>
  </fieldset>
  <details className={styles.copy}>
   <summary>Copy internal draft summary</summary>
   <p>Open, select the text, and copy it to your approved private workspace. WGOS does not save or share it.</p>
   <label className={styles.field}><span>Draft summary</span><textarea readOnly rows={8} spellCheck={false} value={draftText}/></label>
  </details>
 </section>;
}

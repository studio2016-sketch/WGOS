'use client';

import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {parsePlanImport,plannedRentalSubtotal,type PlannedEquipmentRecord,STUDIO_PLAN_MAX_BYTES,STUDIO_PLAN_MAX_ITEMS} from '../../../../lib/studio-planned-equipment-input';
import styles from '../quote-margin.module.css';

const usd=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const cents=(value:number|null)=>value===null?'Unknown':usd.format(value/100);
type Receipt={itemCode:string;id:string;disposition:'inserted'|'existing'};

export default function PlannedEquipmentCatalog({items,truncated}:{items:PlannedEquipmentRecord[];truncated:boolean}){
 const router=useRouter();
 const [text,setText]=useState('');
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const inflight=useRef(false);
 const [receipt,setReceipt]=useState<Receipt[]>([]);
 const [selection,setSelection]=useState<Record<string,string>>({});
 const [days,setDays]=useState('');
 const selected=items.filter(item=>Object.hasOwn(selection,item.id));
 const estimate=plannedRentalSubtotal(selected.map(item=>({quantity:selection[item.id],rentalRatePerDayCents:item.rentalRatePerDayCents})),days);
 function toggle(id:string,checked:boolean){
  setSelection(current=>{
   const next={...current};
   if(checked)next[id]='';
   else delete next[id];
   return next;
  });
 }
 async function importBatch(){
  if(inflight.current)return;
  setError('');setNotice('');setReceipt([]);
  let body:string;
  try{
   const parsed=parsePlanImport(JSON.parse(text));
   body=JSON.stringify({items:parsed});
   if(new TextEncoder().encode(body).byteLength>STUDIO_PLAN_MAX_BYTES)throw new Error('The batch is too large.');
  }catch(err){
   setError(err instanceof SyntaxError?'Paste a valid JSON object before importing.':err instanceof Error?err.message:'The batch is invalid.');
   return;
  }
  // Only this explicit button writes. A retry submits the same stable item keys
  // even if the original request completed after a network interruption.
  inflight.current=true;
  setBusy(true);
  try{
   const response=await fetch('/api/admin/pursuits/planned-equipment',{
    method:'POST',mode:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},
    body,signal:AbortSignal.timeout(25_000),
   });
   const result=await response.json();
   if(!response.ok){
    const conflicts=Array.isArray(result.conflicts)?` Codes: ${result.conflicts.join(', ')}.`:'';
    throw new Error((typeof result.error==='string'?result.error:'Import was not confirmed.')+conflicts);
   }
   if(!result.ok||!Array.isArray(result.items)||!result.items.length)throw new Error('No import result was confirmed. Retry the same batch.');
   const rows=result.items as Receipt[];
   const added=rows.filter(item=>item.disposition==='inserted').length;
   setReceipt(rows);setText('');setNotice(`${added} added. ${rows.length-added} already matched and were left unchanged.`);
   router.refresh();
  }catch(error){
   setError(error instanceof Error?error.message:'Import was not confirmed. Retry the same batch.');
  }finally{
   inflight.current=false;setBusy(false);
  }
 }
 return <>
  <section className={`adminPanel ${styles.desk}`} aria-labelledby="planned-import-title">
   <header className={styles.header}><div><p className="eyebrow">PRIVATE PRICING BASIS</p><h2 id="planned-import-title">Import planning items</h2></div><span className={styles.badge}>Planning only</span></header>
   <p className={styles.notice}>Every entry is unavailable, with zero on hand. Import does not receive stock, publish items, approve a quote, reserve equipment or charge anyone.</p>
   <p>Paste a JSON object with an <code>items</code> array of 1–{STUDIO_PLAN_MAX_ITEMS} entries. Each entry needs <code>itemCode</code>, <code>name</code>, <code>category</code>, <code>replacementValueCents</code> and <code>rentalRatePerDayCents</code>. Use whole USD cents or <code>null</code> for unknown prices. <code>sourceReference</code> is optional. Do not paste contact information, credentials or full vendor documents.</p>
   <label className={styles.field}><span>Planning batch JSON</span><textarea rows={6} spellCheck={false} maxLength={STUDIO_PLAN_MAX_BYTES} disabled={busy} value={text} onChange={e=>setText(e.target.value)}/></label>
   <div><button type="button" className="primary" disabled={busy||!text.trim()} onClick={importBatch}>{busy?'Importing…':'Import planned items'}</button></div>
   {error&&<p role="alert" className={styles.warning}>{error}</p>}
   {notice&&<p role="status">{notice}</p>}
   {receipt.length>0&&<details className={styles.copy}><summary>Import receipt</summary><ul>{receipt.map(row=><li key={row.id}>{row.itemCode} — {row.disposition==='inserted'?'Added':'Already matched'} · {row.id}</li>)}</ul></details>}
  </section>
  <section className={`adminPanel ${styles.desk}`} aria-labelledby="planned-list-title">
   <div><h2 id="planned-list-title">Private planned catalog</h2><p>Purchase / replacement values and per-day rental planning rates are not retail prices or client quotes.</p></div>
   <fieldset className={styles.fieldset}>
    <legend>Equipment-only pricing scratch</legend>
    <p>Select catalog items below and enter quantities and days. No items are owned or available through this catalog. Confirm owned equipment availability, then account for taxes, labor, delivery and coverage separately. Do not double-count bundled gear or treat internal allocations as client lines.</p>
    <label className={styles.field}><span>Rental days (whole days, 1–365)</span><input inputMode="numeric" maxLength={3} placeholder="Unknown" value={days} onChange={e=>setDays(e.target.value)}/></label>
    <output aria-live="polite">{estimate.kind==='subtotal'?`Draft equipment-only subtotal: ${cents(estimate.cents)}. Availability is not verified.`:estimate.kind==='empty'?'Select one or more items to estimate an equipment subtotal.':'Subtotal unavailable: each item needs a known rate and valid quantity, and rental days must be entered.'}</output>
   </fieldset>
   {truncated&&<p role="status">First 300 items shown. The catalog is not exhaustive.</p>}
   {!items.length?<p>No planned items yet.</p>:<ul className={styles.readiness} style={{listStyle:'none',padding:0}}>{items.map(item=><li className={styles.check} key={item.id}>
    <strong>{item.name}</strong><p>{item.itemCode} · {item.category}</p><p>On hand: 0 · Unavailable (planning only)</p>
    <dl><dt>Purchase / replacement value</dt><dd>{cents(item.replacementValueCents)}</dd><dt>Rental rate per day</dt><dd>{cents(item.rentalRatePerDayCents)}</dd><dt>Source reference</dt><dd>{item.sourceReference||'Not recorded'}</dd></dl>
    <label><input type="checkbox" checked={Object.hasOwn(selection,item.id)} onChange={e=>toggle(item.id,e.target.checked)}/> Include {item.itemCode} in subtotal</label>
    {Object.hasOwn(selection,item.id)&&<label className={styles.field}><span>Requested quantity for {item.itemCode} (1–999)</span><input inputMode="numeric" maxLength={3} placeholder="Unknown" value={selection[item.id]} onChange={e=>setSelection(prev=>({...prev,[item.id]:e.target.value}))}/></label>}
   </li>)}</ul>}
  </section>
 </>;
}

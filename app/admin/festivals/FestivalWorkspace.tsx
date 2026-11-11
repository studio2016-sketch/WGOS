'use client';
import {useState} from 'react';
import styles from './festivals.module.css';
type RecordRow={festival:string;details:string[]};
function EvidenceText({text}:{text:string}){
 const parts=text.split(/(https:\/\/[^\s)]+(?:\?[^\s)]+)?)/g);
 return <>{parts.map((part,i)=>part.startsWith('https://')?<a key={i} href={part} target="_blank" rel="noopener noreferrer">{part.includes('mail.google')?'Email evidence':part}</a>:<span key={i}>{part}</span>)}</>;
}
export default function FestivalWorkspace({records,history}:{records:RecordRow[];history:string}){
 const [query,setQuery]=useState('');
 const shown=records.filter(r=>(r.festival+' '+r.details.join(' ')).toLowerCase().includes(query.toLowerCase()));
 return <section className={styles.workspace}>
 <div className={styles.metrics}><article><small>FESTIVALS APPROACHED</small><strong>{history.match(/covers (\d+) distinct festivals/)?.[1]||"—"}</strong><span>Submissions or programming pitches</span></article><article><small>PROGRAMMING RESPONSE</small><strong>Evidence-led</strong><span>Review acknowledgments are not offers</span></article><article><small>LAST IMPORT</small><strong>Campaign history</strong><span>Historical record · not a live inbox sync</span></article></div>
 <div className={styles.notice}><b>A submission is a starting point.</b> Sent pitches, receipt confirmations and booking acceptances remain distinct. Unknown dates, fees and availability stay unknown. No confirmed booking is recorded in this import.</div>
 <section className={styles.next}><h2>Next actions</h2><p>Review the pending routes, required materials and reply history below before the next submission. Current requirements and deadlines must be rechecked before acting.</p></section>
 <div className={styles.filters}><h2>Festival records</h2><label>Search festival, country, contact or status<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search records…"/></label><span role="status">{shown.length} history entries</span></div>
 <div className={styles.records}>{shown.map((r,i)=><article key={r.festival+i}><h3>{r.festival}</h3>{r.details.map((d,j)=><p key={j}><EvidenceText text={d}/></p>)}</article>)}</div>{!shown.length&&<p>No matching records. Try another festival or contact.</p>}
 <details className={styles.source}><summary>Complete imported history, replies and submission evidence</summary><p>Authoritative import from the festival campaign tracker. This view preserves the original wording and message identifiers.</p><pre>{history}</pre></details>
 <p className={styles.notice}>This first integration is a searchable historical view inside WGOS. Updates are imported with the campaign record; inline editing, automatic inbox synchronization and automatic outreach are not enabled.</p>
 </section>;
}

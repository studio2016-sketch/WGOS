"use client";

import {useState} from "react";
import {collectEvidence, SOURCE_TEXT_LIMIT, verifyEvidencePointer} from "../../../lib/studio-quote-evidence";

export default function StudioEvidenceIntake(){
 const [source,setSource]=useState("");
 const [label,setLabel]=useState("");
 const [result,setResult]=useState<ReturnType<typeof collectEvidence>|null>(null);
 const [checked,setChecked]=useState<number[]>([]);
 const [copyStatus,setCopyStatus]=useState("");
 function clearResults(){setResult(null);setChecked([]);setCopyStatus("");}
 const reviewed=result?.ok?result.candidates.filter(x=>checked.includes(x.line)&&verifyEvidencePointer(result.lines,x.line,x.excerpt)):[];
 const exportText=reviewed.map(x=>`[${label.trim() || "Local source"} · copied line ${x.line}] ${x.excerpt}`).join("\n");
 return <section className="adminPanel" aria-labelledby="studio-evidence-title" style={{marginBlock:"1rem",padding:"clamp(1rem, 3vw, 2rem)",minWidth:0}}>
 <p className="eyebrow">STUDIO2016 / SOURCE REVIEW</p>
 <h2 id="studio-evidence-title">Rider &amp; bid evidence</h2>
 <p style={{maxWidth:"68ch"}}>Paste the relevant section and highlight candidate requirements. This runs locally in this tab; nothing is fetched, sent to a model, or saved. Line numbers refer to your pasted text, not the original document.</p>
 <div style={{display:"grid",gap:"0.6rem",maxWidth:"70rem"}}>
  <label htmlFor="studio-evidence-label">Source reference (title, link, page or addendum)</label>
  <input id="studio-evidence-label" value={label} onChange={e=>{setLabel(e.target.value);clearResults();}} maxLength={350} style={{minHeight:42,fontSize:"1rem",width:"100%",padding:"0.5rem",borderRadius:6,border:"1px solid #64748b"}}/>
  <label htmlFor="studio-evidence-source">Copied text</label>
  <textarea id="studio-evidence-source" rows={5} value={source} onChange={e=>{setSource(e.target.value);clearResults();}} maxLength={SOURCE_TEXT_LIMIT+1} style={{minHeight:116,fontSize:"1rem",width:"100%",padding:"0.5rem",borderRadius:6,border:"1px solid #64748b"}} />
  <div style={{display:"flex",gap:"0.65rem",flexWrap:"wrap"}}>
   <button type="button" onClick={()=>{setChecked([]);setCopyStatus("");setResult(collectEvidence(source));}} style={{minHeight:44,padding:"0.4rem 0.75rem"}}>Find candidate lines</button>
   <button type="button" onClick={()=>{setSource("");setLabel("");clearResults();}} style={{minHeight:44,padding:"0.4rem 0.75rem"}}>Clear source</button>
  </div>
 </div>
 {result&&!result.ok&&<p role="alert">{result.reason}</p>}
 {result?.ok&&<>
  <p role="status">{result.candidates.length} candidate lines. Read the full source for exclusions, context, and anything not highlighted.</p>
  {result.candidates.length>0&&<ul style={{listStyle:"none",padding:0,display:"grid",gap:"0.45rem",maxHeight:"24rem",overflowY:"auto"}}>
  {result.candidates.map(x=><li key={x.line}><label style={{display:"flex",gap:"0.5rem",alignItems:"start",minHeight:44,overflowWrap:"anywhere"}}>
   <input type="checkbox" checked={checked.includes(x.line)} onChange={e=>{setCopyStatus("");setChecked(prev=>e.target.checked?[...prev,x.line]:prev.filter(line=>line!==x.line));}}/>
   <span><strong>Line {x.line} · {x.groups.join(", ")}</strong><br/>{x.excerpt}</span>
  </label></li>)}
  </ul>}
 </>}
 {reviewed.length>0&&<div>
  <label htmlFor="studio-reviewed-evidence">Selected excerpts to use as quote references</label>
  <textarea id="studio-reviewed-evidence" readOnly rows={4} value={exportText} style={{width:"100%",fontSize:"1rem",padding:"0.5rem",marginTop:"0.4rem"}}/>
  <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(exportText);setCopyStatus("Copied. Review the scope in the quote desk before pricing.");}catch{setCopyStatus("Could not copy automatically. Select the excerpts above to copy them.");}}} style={{minHeight:44,padding:"0.4rem 0.75rem"}}>Copy selected evidence</button>
  <p role="status">{copyStatus}</p>
 </div>}
 </section>;
}

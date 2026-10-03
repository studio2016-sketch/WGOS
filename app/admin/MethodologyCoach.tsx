"use client";
import {methodologyGaps,methodologyReadiness} from "../../lib/sales-methodology";
export default function MethodologyCoach({opportunity,profile}:{opportunity:any;profile:any}){
 const gaps=methodologyGaps(opportunity,profile),readiness=methodologyReadiness(opportunity,profile);
 return <section style={{padding:14,border:"1px solid rgba(255,255,255,.08)",borderRadius:14}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><small>INTEGRATED SALES COACH</small><strong style={{display:"block",fontSize:"1.15rem"}}>MEDDPICC + Challenger + Sandler + Girard</strong></div><div><small>READINESS</small><strong style={{display:"block",fontSize:"1.5rem"}}>{readiness}%</strong></div></div>
  {gaps.length?<div style={{display:"grid",gap:8,marginTop:12}}>{gaps.slice(0,5).map(g=><div key={g.key} style={{padding:10,border:"1px solid rgba(255,255,255,.06)",borderRadius:10}}><small>{g.framework}</small><strong style={{display:"block"}}>{g.label}</strong><span className="muted">{g.action}</span></div>)}</div>:<p className="muted" style={{marginTop:10}}>Core qualification and closing elements are covered.</p>}
 </section>;
}

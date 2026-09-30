export default function ExecutiveAttention({proposals,readiness,agreements,projects}:{proposals:any[];readiness:any[];agreements:any[];projects:any[]}){
 const drafts=proposals.filter(p=>p.status==="DRAFT").length;
 const clientWaiting=proposals.filter(p=>["APPROVED","SENT"].includes(p.status)).length;
 const accepted=proposals.filter(p=>p.status==="ACCEPTED").length;
 const signature=agreements.filter(a=>a.status==="READY_FOR_SIGNATURE").length;
 const setup=readiness.filter(r=>!r.complete_for_signing||r.terms_status!=="APPROVED"||!r.complete_for_payment).length;
 const active=projects.filter(p=>["PLANNING","ACTIVE","BLOCKED"].includes(p.status)).length;
 const items=[["Proposal drafts",drafts,"Prepare or approve"],["Waiting on client",clientWaiting,"Proposal response"],["Accepted",accepted,"Advance agreement"],["Signature queue",signature,"Provider action"],["Setup attention",setup,"Contract/payment readiness"],["Active delivery",active,"Operations"]];
 return <section className="attentionStrip" aria-label="Executive attention"><div className="attentionIntro"><p className="eyebrow">EXECUTIVE ATTENTION</p><h2>What needs movement</h2></div><div className="attentionItems">{items.map(([label,count,note])=><div className={Number(count)>0?"attentionItem active":"attentionItem"} key={String(label)}><strong>{count}</strong><span>{label}</span><small>{note}</small></div>)}</div></section>;
}
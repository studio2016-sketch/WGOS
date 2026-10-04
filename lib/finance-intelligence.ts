import "server-only";
import {db} from "./db";

const normalize=(s:any)=>String(s||"").toLowerCase().replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim();
const tokenScore=(a:string,b:string)=>{const aa=new Set(normalize(a).split(" ").filter(x=>x.length>2)),bb=new Set(normalize(b).split(" ").filter(x=>x.length>2));if(!aa.size||!bb.size)return 0;let hit=0;for(const x of aa)if(bb.has(x))hit++;return Math.round(hit/Math.max(aa.size,bb.size)*100);};
const dateScore=(a:any,b:any)=>{if(!a||!b)return 0;const d=Math.abs(new Date(a).getTime()-new Date(b).getTime())/86400000;return d<=1?100:d<=3?85:d<=7?60:d<=14?30:0;};
const amountScore=(a:number,b:number)=>{if(!a&&!b)return 100;if(!a||!b)return 0;const diff=Math.abs(a-b),pct=diff/Math.max(a,b);return diff===0?100:pct<=.01?95:pct<=.03?80:pct<=.1?50:0;};

export async function refreshFinanceIntelligence(brandId?:string){
 const sql=db();
 const brands:any[]=brandId?await sql`SELECT id FROM wgos.brands WHERE id=${brandId}`:await sql`SELECT id FROM wgos.brands`;
 for(const b of brands){await buildBankSuggestions(String(b.id));await buildFinanceAlerts(String(b.id));}
}

async function buildBankSuggestions(brandId:string){
 const sql=db();const policy:any=(await sql`SELECT * FROM wgos.finance_automation_policies WHERE brand_id=${brandId} LIMIT 1`)[0];
 const txs:any[]=await sql`SELECT * FROM wgos.bank_transaction_inbox WHERE brand_id=${brandId} AND status IN ('UNMATCHED','SUGGESTED') ORDER BY posted_date DESC LIMIT 100`;
 const [expenses,costs,invoices,payments,pos,crew]=await Promise.all([
  sql`SELECT id,merchant,description,amount_cents,expense_date,status FROM wgos.expense_claims WHERE brand_id=${brandId} AND status NOT IN ('REJECTED','VOID') ORDER BY expense_date DESC LIMIT 300`,
  sql`SELECT id,vendor_name,description,amount_cents,COALESCE(incurred_at,due_at,created_at) tx_date,payment_status FROM wgos.contract_costs WHERE brand_id=${brandId} AND payment_status<>'VOID' ORDER BY created_at DESC LIMIT 300`,
  sql`SELECT id,invoice_number,total_cents,due_cents,COALESCE(issued_at,due_at,created_at) tx_date,status FROM wgos.invoices WHERE brand_id=${brandId} AND status<>'VOID' ORDER BY created_at DESC LIMIT 300`,
  sql`SELECT py.id,py.amount,COALESCE(py.paid_at,py.created_at) tx_date,py.status FROM wgos.payments py JOIN wgos.proposals p ON p.id=py.proposal_id WHERE p.brand_id=${brandId} ORDER BY COALESCE(py.paid_at,py.created_at) DESC LIMIT 300`,
  sql`SELECT id,po_number,title,total_cents,COALESCE(ordered_at,expected_at,created_at) tx_date,status FROM wgos.purchase_orders WHERE brand_id=${brandId} AND status<>'CANCELLED' ORDER BY created_at DESC LIMIT 300`,
  sql`SELECT id,role_name,rate_cents,per_diem_cents,COALESCE(call_at,created_at) tx_date,payment_status FROM wgos.crew_bookings WHERE brand_id=${brandId} AND booking_status<>'CANCELLED' ORDER BY created_at DESC LIMIT 300`
 ]);
 const candidates:any[]=[
  ...expenses.map((x:any)=>({type:"EXPENSE_CLAIM",id:x.id,label:[x.merchant,x.description].filter(Boolean).join(" · "),amount:Number(x.amount_cents||0),date:x.expense_date})),
  ...costs.map((x:any)=>({type:"CONTRACT_COST",id:x.id,label:[x.vendor_name,x.description].filter(Boolean).join(" · "),amount:Number(x.amount_cents||0),date:x.tx_date})),
  ...invoices.map((x:any)=>({type:"INVOICE",id:x.id,label:"Invoice "+(x.invoice_number||x.id),amount:Number(x.due_cents||x.total_cents||0),date:x.tx_date})),
  ...payments.map((x:any)=>({type:"PAYMENT",id:x.id,label:"Payment "+x.id,amount:Math.round(Number(x.amount||0)*100),date:x.tx_date})),
  ...pos.map((x:any)=>({type:"PURCHASE_ORDER",id:x.id,label:[x.po_number,x.title].filter(Boolean).join(" · "),amount:Number(x.total_cents||0),date:x.tx_date})),
  ...crew.map((x:any)=>({type:"PERSONNEL_PAYABLE",id:x.id,label:x.role_name,amount:Number(x.rate_cents||0)+Number(x.per_diem_cents||0),date:x.tx_date}))
 ];
 for(const tx of txs){
  let any=false;
  for(const c of candidates){
   const a=amountScore(Number(tx.amount_cents||0),Number(c.amount||0)),d=dateScore(tx.posted_date,c.date),t=tokenScore(tx.description,c.label);
   const score=Math.round(a*.55+d*.25+t*.20);
   if(score<Number(policy?.suggest_match_score||70))continue; any=true;
   await sql`INSERT INTO wgos.bank_match_suggestions(bank_transaction_id,brand_id,candidate_type,candidate_id,candidate_label,candidate_amount_cents,score,amount_score,date_score,text_score,evidence)
    VALUES(${tx.id}::uuid,${brandId},${c.type},${String(c.id)},${c.label},${c.amount},${score},${a},${d},${t},jsonb_build_object('bankDescription',${tx.description},'postedDate',${tx.posted_date},'bankAmountCents',${Number(tx.amount_cents||0)}))
    ON CONFLICT(bank_transaction_id,candidate_type,candidate_id) DO UPDATE SET score=excluded.score,amount_score=excluded.amount_score,date_score=excluded.date_score,text_score=excluded.text_score,evidence=excluded.evidence,updated_at=now()`;
  }
  await sql`UPDATE wgos.bank_transaction_inbox SET status=${any?"SUGGESTED":"UNMATCHED"},updated_at=now() WHERE id=${tx.id}::uuid AND status<>'MATCHED'`;
 }
}

async function buildFinanceAlerts(brandId:string){
 const sql=db(),p:any=(await sql`SELECT * FROM wgos.finance_automation_policies WHERE brand_id=${brandId} LIMIT 1`)[0];
 const alerts:any[]=[];
 const expenses:any[]=await sql`SELECT * FROM wgos.expense_claims WHERE brand_id=${brandId} AND status NOT IN ('REJECTED','VOID')`;
 for(const x of expenses){
  if(Number(x.amount_cents||0)>=Number(p?.missing_receipt_threshold_cents||7500)&&!x.receipt_ref)alerts.push({type:"MISSING_RECEIPT",severity:"HIGH",title:"Receipt required",detail:(x.merchant||x.description)+" · receipt missing",sourceType:"EXPENSE_CLAIM",sourceId:String(x.id),amount:Number(x.amount_cents||0),fingerprint:`receipt:${x.id}`});
  if(String(x.notes||"").startsWith("Possible duplicate"))alerts.push({type:"DUPLICATE_EXPENSE",severity:"HIGH",title:"Possible duplicate expense",detail:x.notes,sourceType:"EXPENSE_CLAIM",sourceId:String(x.id),amount:Number(x.amount_cents||0),fingerprint:`dup:${x.id}`});
 }
 const rules:any[]=await sql`SELECT * FROM wgos.spend_approval_rules WHERE brand_id=${brandId} AND active=true`;
 for(const x of expenses){for(const r of rules){if((!r.category||String(r.category).toUpperCase()===String(x.category).toUpperCase())&&Number(x.amount_cents||0)>=Number(r.threshold_cents||0)&&!["APPROVED","REIMBURSED"].includes(String(x.status)))alerts.push({type:"APPROVAL_REQUIRED",severity:"HIGH",title:"Spend approval required",detail:(x.merchant||x.description)+" exceeds approval threshold",sourceType:"EXPENSE_CLAIM",sourceId:String(x.id),amount:Number(x.amount_cents||0),fingerprint:`approval:${x.id}:${r.id}`});}}
 const budgets:any[]=await sql`SELECT * FROM wgos.spend_budgets WHERE brand_id=${brandId}`;
 for(const b of budgets){
  const spent:any=(await sql`SELECT COALESCE(sum(amount_cents),0)::bigint total FROM wgos.expense_claims WHERE brand_id=${brandId} AND status NOT IN ('REJECTED','VOID') AND (${b.contract_control_id}::uuid IS NULL OR contract_control_id=${b.contract_control_id}::uuid) AND (${b.project_id}::uuid IS NULL OR project_id=${b.project_id}::uuid) AND (${String(b.category)}='TOTAL' OR upper(category)=${String(b.category).toUpperCase()})`)[0];
  const pct=Number(b.budget_cents)?Number(spent?.total||0)/Number(b.budget_cents)*100:0;
  if(pct>=Number(b.warning_pct||80))alerts.push({type:pct>=100?"BUDGET_EXCEEDED":"BUDGET_WARNING",severity:pct>=100?"CRITICAL":"WATCH",title:pct>=100?"Budget exceeded":"Budget approaching limit",detail:`${String(b.category)} spend is ${Math.round(pct)}% of budget`,sourceType:"SPEND_BUDGET",sourceId:String(b.id),amount:Number(spent?.total||0),fingerprint:`budget:${b.id}:${pct>=100?"over":"warn"}`});
 }
 const stale:any[]=await sql`SELECT * FROM wgos.invoices WHERE brand_id=${brandId} AND status IN ('OPEN','PARTIALLY_PAID') AND due_at<now()-((${Number(p?.stale_receivable_days||15)}||' days')::interval)`;
 for(const i of stale)alerts.push({type:"STALE_RECEIVABLE",severity:"HIGH",title:"Receivable needs follow-up",detail:"Invoice "+(i.invoice_number||i.id)+" is overdue",sourceType:"INVOICE",sourceId:String(i.id),amount:Number(i.due_cents||0),dueAt:i.due_at,fingerprint:`ar:${i.id}`});
 const payables:any[]=await sql`SELECT * FROM wgos.contract_costs WHERE brand_id=${brandId} AND payment_status IN ('UNPAID','APPROVED','SCHEDULED') AND due_at<now()-((${Number(p?.overdue_payable_days||1)}||' days')::interval)`;
 for(const x of payables)alerts.push({type:"OVERDUE_PAYABLE",severity:"HIGH",title:"Payable overdue",detail:x.description,sourceType:"CONTRACT_COST",sourceId:String(x.id),amount:Number(x.amount_cents||0),dueAt:x.due_at,fingerprint:`ap:${x.id}`});
 const unmatched:any[]=await sql`SELECT * FROM wgos.bank_transaction_inbox WHERE brand_id=${brandId} AND status='UNMATCHED' AND posted_date<current_date-3`;
 for(const x of unmatched)alerts.push({type:"UNMATCHED_BANK",severity:"WATCH",title:"Bank transaction unmatched",detail:x.description,sourceType:"BANK_TRANSACTION",sourceId:String(x.id),amount:Number(x.amount_cents||0),fingerprint:`bank:${x.id}`});
 const cash:any[]=await sql`SELECT forecast_date,sum(net_cents)::bigint net FROM wgos.cash_flow_forecast WHERE brand_id=${brandId} AND forecast_date BETWEEN current_date AND current_date+${Number(p?.negative_cash_window_days||30)} GROUP BY forecast_date ORDER BY forecast_date`;
 const net=cash.reduce((n:number,x:any)=>n+Number(x.net||0),0);if(net<0)alerts.push({type:"NEGATIVE_CASH_WINDOW",severity:"HIGH",title:"Negative cash-flow window",detail:`Projected net cash movement is ${(net/100).toLocaleString(undefined,{style:"currency",currency:"USD"})} over the policy window`,sourceType:"CASH_FORECAST",sourceId:brandId,amount:Math.abs(net),fingerprint:`cash:${brandId}:${new Date().toISOString().slice(0,10)}`});
 for(const a of alerts)await sql`INSERT INTO wgos.finance_exception_alerts(brand_id,alert_type,severity,title,detail,source_type,source_id,amount_cents,due_at,fingerprint)
  VALUES(${brandId},${a.type},${a.severity},${a.title},${a.detail||null},${a.sourceType||null},${a.sourceId||null},${a.amount||null},${a.dueAt||null},${a.fingerprint})
  ON CONFLICT(fingerprint) DO UPDATE SET severity=excluded.severity,title=excluded.title,detail=excluded.detail,amount_cents=excluded.amount_cents,due_at=excluded.due_at,updated_at=now()`;
}

export async function listFinanceExceptions(authUserId?:string|null,isGlobal=false){
 const sql=db();const brands=authUserId&&!isGlobal?await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships bm ON bm.brand_id=b.id AND bm.auth_user_id=${authUserId} AND bm.active=true ORDER BY b.name`:await sql`SELECT id,name FROM wgos.brands ORDER BY name`;
 const ids=brands.map((x:any)=>x.id);if(!ids.length)return {brands,alerts:[],transactions:[],suggestions:[]};for(const id of ids)await refreshFinanceIntelligence(String(id));
 const [alerts,transactions,suggestions]=await Promise.all([
  sql`SELECT * FROM wgos.finance_exception_alerts WHERE brand_id=ANY(${ids}::text[]) AND status IN ('OPEN','ACKNOWLEDGED') ORDER BY CASE severity WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'WATCH' THEN 2 ELSE 1 END DESC,created_at DESC`,
  sql`SELECT * FROM wgos.bank_transaction_inbox WHERE brand_id=ANY(${ids}::text[]) AND status IN ('UNMATCHED','SUGGESTED') ORDER BY posted_date DESC`,
  sql`SELECT * FROM wgos.bank_match_suggestions WHERE brand_id=ANY(${ids}::text[]) AND status='SUGGESTED' ORDER BY score DESC,created_at DESC`
 ]);return {brands,alerts,transactions,suggestions};
}

export async function acceptBankMatch(input:any){
 const sql=db(),sid=String(input.suggestionId);const s:any=(await sql`SELECT * FROM wgos.bank_match_suggestions WHERE id=${sid}::uuid LIMIT 1`)[0];if(!s)throw new Error("Suggestion not found.");
 await sql`UPDATE wgos.bank_match_suggestions SET status=CASE WHEN id=${sid}::uuid THEN 'ACCEPTED' ELSE 'REJECTED' END,updated_at=now() WHERE bank_transaction_id=${s.bank_transaction_id}::uuid AND status='SUGGESTED'`;
 const r=await sql`UPDATE wgos.bank_transaction_inbox SET status='MATCHED',matched_object_type=${s.candidate_type},matched_object_id=${s.candidate_id},confidence=${s.score},updated_at=now() WHERE id=${s.bank_transaction_id}::uuid RETURNING *`;return r[0];
}
export async function rejectBankSuggestion(input:any){const sql=db();const r=await sql`UPDATE wgos.bank_match_suggestions SET status='REJECTED',updated_at=now() WHERE id=${String(input.suggestionId)}::uuid RETURNING *`;if(!r[0])throw new Error("Suggestion not found.");return r[0];}
export async function updateFinanceAlert(input:any){const sql=db(),status=String(input.status||"ACKNOWLEDGED");const r=await sql`UPDATE wgos.finance_exception_alerts SET status=${status},resolution_notes=COALESCE(${input.notes||null},resolution_notes),resolved_by=CASE WHEN ${status} IN ('RESOLVED','DISMISSED') THEN ${input.actor||null} ELSE resolved_by END,resolved_at=CASE WHEN ${status} IN ('RESOLVED','DISMISSED') THEN now() ELSE resolved_at END,updated_at=now() WHERE id=${String(input.alertId)}::uuid RETURNING *`;if(!r[0])throw new Error("Alert not found.");return r[0];}

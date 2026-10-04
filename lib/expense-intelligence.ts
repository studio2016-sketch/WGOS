import "server-only";
import {db} from "./db";

export async function listExpenseIntelligence(authUserId?:string|null,isGlobal=false){
 const sql=db();
 const brands=authUserId&&!isGlobal
  ?await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships bm ON bm.brand_id=b.id AND bm.auth_user_id=${authUserId} AND bm.active=true ORDER BY b.name`
  :await sql`SELECT id,name FROM wgos.brands ORDER BY name`;
 const brandIds=brands.map((b:any)=>b.id);
 if(!brandIds.length)return {brands,claims:[],mileage:[],budgets:[],rules:[],forecast:[],bankInbox:[],contracts:[],projects:[],users:[]};
 const [claims,mileage,budgets,rules,forecast,bankInbox,contracts,projects,users]=await Promise.all([
  sql`SELECT ec.*,b.name brand_name,u.display_name claimant_name,a.display_name approver_name FROM wgos.expense_claims ec JOIN wgos.brands b ON b.id=ec.brand_id LEFT JOIN wgos.app_users u ON u.auth_user_id=ec.claimant_subject LEFT JOIN wgos.app_users a ON a.auth_user_id=ec.approver_subject WHERE ec.brand_id=ANY(${brandIds}::text[]) ORDER BY ec.created_at DESC LIMIT 300`,
  sql`SELECT mc.*,b.name brand_name,u.display_name claimant_name FROM wgos.mileage_claims mc JOIN wgos.brands b ON b.id=mc.brand_id LEFT JOIN wgos.app_users u ON u.auth_user_id=mc.claimant_subject WHERE mc.brand_id=ANY(${brandIds}::text[]) ORDER BY mc.created_at DESC LIMIT 300`,
  sql`SELECT * FROM wgos.spend_budgets WHERE brand_id=ANY(${brandIds}::text[]) ORDER BY updated_at DESC`,
  sql`SELECT r.*,u.display_name approver_name FROM wgos.spend_approval_rules r LEFT JOIN wgos.app_users u ON u.auth_user_id=r.approver_subject WHERE r.brand_id=ANY(${brandIds}::text[]) AND r.active=true ORDER BY r.threshold_cents`,
  sql`SELECT * FROM wgos.cash_flow_forecast WHERE brand_id=ANY(${brandIds}::text[]) AND forecast_date BETWEEN current_date AND current_date+180 ORDER BY forecast_date`,
  sql`SELECT * FROM wgos.bank_transaction_inbox WHERE brand_id=ANY(${brandIds}::text[]) ORDER BY posted_date DESC,created_at DESC LIMIT 300`,
  sql`SELECT cc.id control_id,cc.brand_id,a.title agreement_title,o.title opportunity_title FROM wgos.contract_controls cc JOIN wgos.agreements a ON a.id=cc.agreement_id JOIN wgos.proposals p ON p.id=cc.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id WHERE cc.brand_id=ANY(${brandIds}::text[]) ORDER BY cc.updated_at DESC`,
  sql`SELECT id,brand_id,title FROM wgos.projects WHERE brand_id=ANY(${brandIds}::text[]) AND status<>'CANCELLED' ORDER BY updated_at DESC`,
  sql`SELECT DISTINCT u.auth_user_id,u.display_name,u.email FROM wgos.app_users u JOIN wgos.brand_memberships bm ON bm.auth_user_id=u.auth_user_id WHERE bm.brand_id=ANY(${brandIds}::text[]) AND bm.active=true ORDER BY u.display_name NULLS LAST,u.email`
 ]);
 return {brands,claims,mileage,budgets,rules,forecast,bankInbox,contracts,projects,users};
}

function duplicateKey(input:any){return [String(input.brandId||""),String(input.merchant||"").trim().toLowerCase(),String(input.amount||"0"),String(input.expenseDate||"")].join("|");}

export async function createExpenseClaim(input:any){
 const sql=db(),desc=String(input.description||"").trim();if(!desc)throw new Error("Expense description required.");
 const amount=Math.max(0,Math.round(Number(input.amount||0)*100));if(!amount)throw new Error("Expense amount required.");
 const key=duplicateKey(input);
 const dupe=await sql`SELECT id FROM wgos.expense_claims WHERE duplicate_key=${key} AND status<>'VOID' LIMIT 1`;
 const receipt=String(input.receiptRef||"").trim();
 const rows=await sql`INSERT INTO wgos.expense_claims(brand_id,contract_control_id,project_id,claimant_subject,merchant,description,category,amount_cents,expense_date,reimbursable,billable_to_client,receipt_ref,receipt_capture_status,status,duplicate_key,notes)
 VALUES(${String(input.brandId)},${input.controlId||null}::uuid,${input.projectId||null}::uuid,${input.actor||null},${input.merchant||null},${desc},${input.category||"MISC"},${amount},COALESCE(${input.expenseDate||null}::date,current_date),${input.reimbursable!==false},${Boolean(input.billableToClient)},${receipt||null},${receipt?"ATTACHED":"NOT_ATTACHED"},'SUBMITTED',${key},${dupe[0]?"Possible duplicate of "+String((dupe[0] as any).id)+(input.notes?" · "+input.notes:""):input.notes||null}) RETURNING *`;return rows[0];
}
export async function createMileageClaim(input:any){
 const sql=db(),brandId=String(input.brandId),purpose=String(input.businessPurpose||"").trim();if(!purpose)throw new Error("Business purpose required.");
 const miles=Math.max(0,Number(input.miles)||0);if(!miles)throw new Error("Mileage required.");
 const pol:any=(await sql`SELECT * FROM wgos.mileage_policies WHERE brand_id=${brandId} LIMIT 1`)[0];
 const rate=Math.max(0,Number(input.rateCentsPerMile??pol?.rate_cents_per_mile??0));
 const rows=await sql`INSERT INTO wgos.mileage_claims(brand_id,contract_control_id,project_id,claimant_subject,trip_date,origin,destination,business_purpose,miles,rate_cents_per_mile,reimbursement_cents,status,notes)
 VALUES(${brandId},${input.controlId||null}::uuid,${input.projectId||null}::uuid,${input.actor||null},COALESCE(${input.tripDate||null}::date,current_date),${input.origin||null},${input.destination||null},${purpose},${miles},${rate},${Math.round(miles*rate)},'SUBMITTED',${input.notes||null}) RETURNING *`;return rows[0];
}
export async function updateClaimStatus(input:any){
 const sql=db(),kind=String(input.kind),status=String(input.status),id=String(input.id),actor=String(input.actor||"");
 if(kind==="expense"){
  const r=await sql`UPDATE wgos.expense_claims SET status=${status},approver_subject=CASE WHEN ${status}='APPROVED' THEN ${actor} ELSE approver_subject END,approved_at=CASE WHEN ${status}='APPROVED' THEN now() ELSE approved_at END,reimbursed_at=CASE WHEN ${status}='REIMBURSED' THEN now() ELSE reimbursed_at END,updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Expense claim not found.");return r[0];
 }
 if(kind==="mileage"){
  const r=await sql`UPDATE wgos.mileage_claims SET status=${status},approver_subject=CASE WHEN ${status}='APPROVED' THEN ${actor} ELSE approver_subject END,approved_at=CASE WHEN ${status}='APPROVED' THEN now() ELSE approved_at END,reimbursed_at=CASE WHEN ${status}='REIMBURSED' THEN now() ELSE reimbursed_at END,updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Mileage claim not found.");return r[0];
 }
 throw new Error("Unsupported claim type.");
}
export async function saveMileagePolicy(input:any){
 const sql=db(),brandId=String(input.brandId),rate=Math.max(0,Math.round(Number(input.rateCentsPerMile)||0));
 const r=await sql`INSERT INTO wgos.mileage_policies(brand_id,rate_cents_per_mile,effective_date) VALUES(${brandId},${rate},COALESCE(${input.effectiveDate||null}::date,current_date))
 ON CONFLICT(brand_id) DO UPDATE SET rate_cents_per_mile=excluded.rate_cents_per_mile,effective_date=excluded.effective_date,updated_at=now() RETURNING *`;return r[0];
}
export async function saveSpendBudget(input:any){
 const sql=db(),amount=Math.max(0,Math.round(Number(input.budget||0)*100));if(!amount)throw new Error("Budget amount required.");
 const brandId=String(input.brandId),category=String(input.category||"TOTAL").toUpperCase();
 const r=await sql`INSERT INTO wgos.spend_budgets(brand_id,contract_control_id,project_id,category,budget_cents,warning_pct,hard_stop_pct,notes)
 VALUES(${brandId},${input.controlId||null}::uuid,${input.projectId||null}::uuid,${category},${amount},${Math.max(1,Math.min(100,Number(input.warningPct)||80))},${input.hardStopPct?Number(input.hardStopPct):null},${input.notes||null})
 ON CONFLICT(brand_id,COALESCE(contract_control_id,'00000000-0000-0000-0000-000000000000'::uuid),COALESCE(project_id,'00000000-0000-0000-0000-000000000000'::uuid),category)
 DO UPDATE SET budget_cents=excluded.budget_cents,warning_pct=excluded.warning_pct,hard_stop_pct=excluded.hard_stop_pct,notes=excluded.notes,updated_at=now() RETURNING *`;return r[0];
}
export async function createSpendRule(input:any){
 const sql=db(),threshold=Math.max(0,Math.round(Number(input.threshold||0)*100));
 const r=await sql`INSERT INTO wgos.spend_approval_rules(brand_id,category,threshold_cents,approver_subject,notes) VALUES(${String(input.brandId)},${input.category||null},${threshold},${input.approverSubject||null},${input.notes||null}) RETURNING *`;return r[0];
}
export async function importBankTransaction(input:any){
 const sql=db(),amount=Math.round(Number(input.amount||0)*100);if(!amount)throw new Error("Amount required.");
 const desc=String(input.description||"").trim();if(!desc)throw new Error("Description required.");
 const direction=String(input.direction|| (amount>=0?"INFLOW":"OUTFLOW"));
 const r=await sql`INSERT INTO wgos.bank_transaction_inbox(brand_id,provider,external_account_id,external_transaction_id,posted_date,description,amount_cents,direction,metadata)
 VALUES(${String(input.brandId)},${input.provider||"MANUAL"},${input.externalAccountId||null},${input.externalTransactionId||crypto.randomUUID()},COALESCE(${input.postedDate||null}::date,current_date),${desc},${Math.abs(amount)},${direction},${JSON.stringify({source:"manual"})}::jsonb) RETURNING *`;return r[0];
}
export async function matchBankTransaction(input:any){
 const sql=db();const r=await sql`UPDATE wgos.bank_transaction_inbox SET status=${input.objectId?"MATCHED":"IGNORED"},matched_object_type=${input.objectType||null},matched_object_id=${input.objectId||null},confidence=${input.confidence?Number(input.confidence):null},updated_at=now() WHERE id=${String(input.id)}::uuid RETURNING *`;if(!r[0])throw new Error("Bank transaction not found.");return r[0];
}

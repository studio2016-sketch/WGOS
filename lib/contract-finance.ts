import "server-only";
import {db} from "./db";

export async function listContractFinance(authUserId?:string|null,isGlobal=false){
 const sql=db();
 const controls=authUserId&&!isGlobal
 ?await sql`SELECT cc.id,cc.brand_id,cc.agreement_id,cc.proposal_id,cc.project_id,b.name brand_name,a.title agreement_title,o.title opportunity_title
   FROM wgos.contract_controls cc JOIN wgos.brands b ON b.id=cc.brand_id JOIN wgos.agreements a ON a.id=cc.agreement_id
   JOIN wgos.proposals p ON p.id=cc.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id
   JOIN wgos.brand_memberships bm ON bm.brand_id=cc.brand_id AND bm.auth_user_id=${authUserId} AND bm.active=true
   ORDER BY cc.updated_at DESC`
 :await sql`SELECT cc.id,cc.brand_id,cc.agreement_id,cc.proposal_id,cc.project_id,b.name brand_name,a.title agreement_title,o.title opportunity_title
   FROM wgos.contract_controls cc JOIN wgos.brands b ON b.id=cc.brand_id JOIN wgos.agreements a ON a.id=cc.agreement_id
   JOIN wgos.proposals p ON p.id=cc.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id ORDER BY cc.updated_at DESC`;
 const ids=controls.map((x:any)=>x.id);
 if(!ids.length)return {controls,vendors:[],purchaseOrders:[],financial:[],crewConflicts:[],equipmentConflicts:[],syncQueue:[]};
 const [vendors,purchaseOrders,financial,crewConflicts,equipmentConflicts,syncQueue]=await Promise.all([
  sql`SELECT * FROM wgos.vendor_profiles WHERE brand_id=ANY(${[...new Set(controls.map((x:any)=>x.brand_id))]}::text[]) ORDER BY vendor_name`,
  sql`SELECT po.*,v.vendor_name FROM wgos.purchase_orders po LEFT JOIN wgos.vendor_profiles v ON v.id=po.vendor_profile_id WHERE po.contract_control_id=ANY(${ids}::uuid[]) ORDER BY po.created_at DESC`,
  sql`SELECT f.*,(f.contract_value-(f.entered_costs+f.personnel_commitments+f.open_purchase_commitments))::numeric projected_gross_profit,
    CASE WHEN f.contract_value>0 THEN round(((f.contract_value-(f.entered_costs+f.personnel_commitments+f.open_purchase_commitments))/f.contract_value*100)::numeric,1) ELSE 0 END projected_margin_pct
    FROM wgos.contract_financial_summary f WHERE f.contract_control_id=ANY(${ids}::uuid[])`,
  sql`SELECT a.id booking_a,bk.id booking_b,a.contract_control_id control_a,bk.contract_control_id control_b,a.crew_profile_id,
    c.first_name,c.last_name,a.role_name role_a,bk.role_name role_b,a.call_at start_a,a.release_at end_a,bk.call_at start_b,bk.release_at end_b
   FROM wgos.crew_bookings a JOIN wgos.crew_bookings bk ON bk.crew_profile_id=a.crew_profile_id AND bk.id>a.id
   LEFT JOIN wgos.crew_profiles cp ON cp.id=a.crew_profile_id LEFT JOIN wgos.contacts c ON c.id=cp.contact_id
   WHERE a.contract_control_id=ANY(${ids}::uuid[]) AND bk.contract_control_id=ANY(${ids}::uuid[])
   AND a.crew_profile_id IS NOT NULL AND a.booking_status IN ('INVITED','HELD','CONFIRMED') AND bk.booking_status IN ('INVITED','HELD','CONFIRMED')
   AND a.call_at IS NOT NULL AND a.release_at IS NOT NULL AND bk.call_at IS NOT NULL AND bk.release_at IS NOT NULL
   AND a.call_at<bk.release_at AND bk.call_at<a.release_at`,
  sql`SELECT pea1.project_id project_a,pea2.project_id project_b,ea.id equipment_asset_id,ea.asset_tag,ea.manufacturer,ea.model,
    p1.title project_a_title,p2.title project_b_title,p1.start_at start_a,p1.end_at end_a,p2.start_at start_b,p2.end_at end_b
   FROM wgos.project_equipment_assignments pea1 JOIN wgos.project_equipment_assignments pea2 ON pea2.equipment_asset_id=pea1.equipment_asset_id AND pea2.project_id<>pea1.project_id
   JOIN wgos.equipment_assets ea ON ea.id=pea1.equipment_asset_id JOIN wgos.projects p1 ON p1.id=pea1.project_id JOIN wgos.projects p2 ON p2.id=pea2.project_id
   WHERE (p1.id IN (SELECT project_id FROM wgos.contract_controls WHERE id=ANY(${ids}::uuid[])) OR p2.id IN (SELECT project_id FROM wgos.contract_controls WHERE id=ANY(${ids}::uuid[])))
   AND p1.start_at IS NOT NULL AND p1.end_at IS NOT NULL AND p2.start_at IS NOT NULL AND p2.end_at IS NOT NULL
   AND p1.start_at<p2.end_at AND p2.start_at<p1.end_at`,
  sql`SELECT * FROM wgos.accounting_sync_queue WHERE contract_control_id=ANY(${ids}::uuid[]) ORDER BY created_at DESC LIMIT 100`
 ]);
 return {controls,vendors,purchaseOrders,financial,crewConflicts,equipmentConflicts,syncQueue};
}

async function getControl(sql:any,id:string){const r=await sql`SELECT * FROM wgos.contract_controls WHERE id=${id}::uuid LIMIT 1`;if(!r[0])throw new Error("Contract control not found.");return r[0] as any;}

export async function createVendorProfile(input:any){
 const sql=db(),name=String(input.vendorName||"").trim();if(!name)throw new Error("Vendor name required.");
 const r=await sql`INSERT INTO wgos.vendor_profiles(brand_id,organization_id,contact_id,vendor_name,category,payment_terms,tax_document_status,insurance_status,notes)
 VALUES(${input.brandId},${input.organizationId||null}::uuid,${input.contactId||null}::uuid,${name},${input.category||null},${input.paymentTerms||null},${input.taxDocumentStatus||"UNKNOWN"},${input.insuranceStatus||"NOT_REQUIRED"},${input.notes||null}) RETURNING *`;return r[0];
}
export async function createPurchaseOrder(input:any){
 const sql=db(),cc=await getControl(sql,String(input.controlId)),title=String(input.title||"").trim();if(!title)throw new Error("Purchase order title required.");
 const sub=Math.round(Number(input.subtotal||0)*100),tax=Math.round(Number(input.tax||0)*100),shipping=Math.round(Number(input.shipping||0)*100),total=sub+tax+shipping,deposit=Math.round(Number(input.deposit||0)*100);
 const r=await sql`INSERT INTO wgos.purchase_orders(contract_control_id,project_id,brand_id,vendor_profile_id,po_number,title,status,subtotal_cents,tax_cents,shipping_cents,total_cents,deposit_cents,balance_due_cents,expected_at,notes,created_by)
 VALUES(${cc.id}::uuid,${cc.project_id||null}::uuid,${cc.brand_id},${input.vendorProfileId||null}::uuid,${input.poNumber||null},${title},'DRAFT',${sub},${tax},${shipping},${total},${deposit},${Math.max(0,total-deposit)},${input.expectedAt||null},${input.notes||null},${input.actor||null}) RETURNING *`;return r[0];
}
export async function updatePurchaseOrder(input:any){
 const sql=db(),status=String(input.status||"DRAFT"),paymentStatus=String(input.paymentStatus||"UNPAID");
 const r=await sql`UPDATE wgos.purchase_orders SET status=${status},payment_status=${paymentStatus},
 ordered_at=CASE WHEN ${status} IN ('ISSUED','PARTIALLY_RECEIVED','RECEIVED','CLOSED') THEN COALESCE(ordered_at,now()) ELSE ordered_at END,
 received_at=CASE WHEN ${status} IN ('RECEIVED','CLOSED') THEN COALESCE(received_at,now()) ELSE received_at END,updated_at=now()
 WHERE id=${String(input.id)}::uuid RETURNING *`;if(!r[0])throw new Error("Purchase order not found.");return r[0];
}
export async function addLedgerAdjustment(input:any){
 const sql=db(),cc=await getControl(sql,String(input.controlId)),description=String(input.description||"").trim();if(!description)throw new Error("Ledger description required.");
 const r=await sql`INSERT INTO wgos.contract_ledger_entries(contract_control_id,brand_id,entry_date,entry_type,category,description,amount_cents,source_type,source_id,posted,notes,created_by)
 VALUES(${cc.id}::uuid,${cc.brand_id},COALESCE(${input.entryDate||null}::date,current_date),${input.entryType||"ADJUSTMENT"},${input.category||"GENERAL"},${description},${Math.round(Number(input.amount||0)*100)},'MANUAL',${input.sourceId||null},false,${input.notes||null},${input.actor||null}) RETURNING *`;return r[0];
}
export async function queueAccountingSync(input:any){
 const sql=db(),cc=await getControl(sql,String(input.controlId));
 const r=await sql`INSERT INTO wgos.accounting_sync_queue(brand_id,contract_control_id,provider,object_type,internal_id,action,status,payload)
 VALUES(${cc.brand_id},${cc.id}::uuid,${input.provider||null},${input.objectType||"CONTRACT"},${input.internalId||String(cc.id)},'UPSERT','READY',${JSON.stringify(input.payload||{})}::jsonb) RETURNING *`;return r[0];
}
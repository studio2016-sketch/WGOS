import "server-only";
import {db} from "./db";

export async function reconcileAccountingActivationStates(actor?:string|null){
 const sql=db();
 const funded:any[]=await sql`
  SELECT DISTINCT ON (p.brand_id) p.brand_id,py.id payment_id,py.amount::numeric amount,COALESCE(py.paid_at,py.created_at) occurred_at
  FROM wgos.payments py
  JOIN wgos.proposals p ON p.id=py.proposal_id
  WHERE upper(py.status) IN ('PAID','SUCCEEDED','COMPLETED','SETTLED')
    AND py.amount>0
  ORDER BY p.brand_id,COALESCE(py.paid_at,py.created_at) ASC`;
 for(const p of funded){
  const rows:any[]=await sql`SELECT * FROM wgos.accounting_entity_profiles WHERE brand_id=${String(p.brand_id)} LIMIT 1`;
  const current:any=rows[0];if(!current||current.activation_status!=="NOT_FUNDED")continue;
  const reserve=current.reserve_mode==="PERCENT"
   ?Math.round(Number(p.amount||0)*Number(current.reserve_value||0))/100
   :Math.min(Number(p.amount||0),Number(current.reserve_value||20));
  await sql`UPDATE wgos.accounting_entity_profiles SET activation_status='READY_TO_ACTIVATE',
   first_deposit_amount=${Number(p.amount||0)},first_deposit_at=${p.occurred_at},reserve_amount=${reserve},updated_at=now()
   WHERE brand_id=${String(p.brand_id)} AND activation_status='NOT_FUNDED'`;
  await sql`INSERT INTO wgos.accounting_routing_events(brand_id,event_type,provider,amount,metadata,created_by)
   VALUES(${String(p.brand_id)},'FIRST_DEPOSIT_DETECTED',${current.provider||"QUICKBOOKS"},${Number(p.amount||0)},
   jsonb_build_object('paymentId',${String(p.payment_id)},'reserveAmount',${reserve}),${actor||null})`;
 }
 return funded.length;
}

export async function listAccountingEntityProfiles(authUserId?:string|null,isGlobal=false){
 const sql=db();await reconcileAccountingActivationStates();
 return authUserId&&!isGlobal
 ?sql`SELECT aep.*,b.name brand_name,
   COALESCE((SELECT count(*)::int FROM wgos.accounting_sync_queue q WHERE q.brand_id=aep.brand_id AND q.status IN ('PENDING','READY')),0) queued_items
   FROM wgos.accounting_entity_profiles aep JOIN wgos.brands b ON b.id=aep.brand_id
   JOIN wgos.brand_memberships bm ON bm.brand_id=aep.brand_id AND bm.auth_user_id=${authUserId} AND bm.active=true
   ORDER BY b.name`
 :sql`SELECT aep.*,b.name brand_name,
   COALESCE((SELECT count(*)::int FROM wgos.accounting_sync_queue q WHERE q.brand_id=aep.brand_id AND q.status IN ('PENDING','READY')),0) queued_items
   FROM wgos.accounting_entity_profiles aep JOIN wgos.brands b ON b.id=aep.brand_id ORDER BY b.name`;
}

export async function updateAccountingEntityProfile(input:any){
 const sql=db(),brandId=String(input.brandId||"");
 const rows=await sql`UPDATE wgos.accounting_entity_profiles SET
  provider=${String(input.provider||"QUICKBOOKS")},plan_target=${String(input.planTarget||"LITE")},
  activation_policy=${String(input.activationPolicy||"FIRST_DEPOSIT")},
  reserve_mode=${String(input.reserveMode||"FIXED")},reserve_value=${Math.max(0,Number(input.reserveValue)||0)},
  notes=${input.notes||null},updated_at=now() WHERE brand_id=${brandId} RETURNING *`;
 if(!rows[0])throw new Error("Accounting entity profile not found.");return rows[0];
}

export async function markAccountingProviderConnected(input:any){
 const sql=db(),brandId=String(input.brandId||"");
 const companyId=String(input.providerCompanyId||"").trim();if(!companyId)throw new Error("Provider company ID is required.");
 const rows=await sql`UPDATE wgos.accounting_entity_profiles SET activation_status='CONNECTED',provider=${String(input.provider||"QUICKBOOKS")},
  provider_company_id=${companyId},provider_company_name=${input.providerCompanyName||null},connected_at=now(),sync_enabled=true,updated_at=now()
  WHERE brand_id=${brandId} RETURNING *`;
 if(!rows[0])throw new Error("Accounting entity profile not found.");
 await sql`INSERT INTO wgos.accounting_routing_events(brand_id,event_type,provider,metadata,created_by)
 VALUES(${brandId},'PROVIDER_CONNECTED',${String(input.provider||"QUICKBOOKS")},
 jsonb_build_object('providerCompanyId',${companyId},'providerCompanyName',${input.providerCompanyName||null}),${input.actor||null})`;
 await sql`UPDATE wgos.accounting_sync_queue SET provider=${String(input.provider||"QUICKBOOKS")},status=CASE WHEN status='PENDING' THEN 'READY' ELSE status END,updated_at=now()
 WHERE brand_id=${brandId} AND status IN ('PENDING','READY')`;
 return rows[0];
}

export async function setAccountingSyncEnabled(input:any){
 const sql=db(),brandId=String(input.brandId||""),enabled=Boolean(input.enabled);
 const rows=await sql`UPDATE wgos.accounting_entity_profiles SET sync_enabled=${enabled},updated_at=now() WHERE brand_id=${brandId} RETURNING *`;
 if(!rows[0])throw new Error("Accounting entity profile not found.");
 await sql`INSERT INTO wgos.accounting_routing_events(brand_id,event_type,provider,metadata,created_by)
 VALUES(${brandId},${enabled?"SYNC_ENABLED":"SYNC_DISABLED"},${String((rows[0] as any).provider)},jsonb_build_object('enabled',${enabled}),${input.actor||null})`;
 return rows[0];
}
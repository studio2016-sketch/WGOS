import "server-only";
import {db} from "./db";

export async function listCashEnvelopes(authUserId?:string|null,isGlobal=false){
 const sql=db();
 const brands=authUserId&&!isGlobal
 ?await sql`SELECT b.id,b.name FROM wgos.brands b JOIN wgos.brand_memberships bm ON bm.brand_id=b.id AND bm.auth_user_id=${authUserId} AND bm.active=true ORDER BY b.name`
 :await sql`SELECT id,name FROM wgos.brands ORDER BY name`;
 const ids=brands.map((x:any)=>x.id); if(!ids.length)return {brands,policies:[],summary:[],allocations:[]};
 const [policies,summary,allocations]=await Promise.all([
  sql`SELECT * FROM wgos.cash_allocation_policies WHERE brand_id=ANY(${ids}::text[]) ORDER BY brand_id,priority,bucket_name`,
  sql`SELECT * FROM wgos.cash_envelope_summary WHERE brand_id=ANY(${ids}::text[]) ORDER BY brand_id,bucket_name`,
  sql`SELECT a.*,p.bucket_type FROM wgos.cash_allocations a LEFT JOIN wgos.cash_allocation_policies p ON p.id=a.policy_id WHERE a.brand_id=ANY(${ids}::text[]) ORDER BY a.created_at DESC LIMIT 300`
 ]);
 return {brands,policies,summary,allocations};
}

export async function saveCashAllocationPolicy(input:any){
 const sql=db(),brandId=String(input.brandId),name=String(input.bucketName||"").trim();if(!name)throw new Error("Bucket name required.");
 const pct=Math.max(0,Math.min(100,Number(input.allocationPct)||0));
 const r=await sql`INSERT INTO wgos.cash_allocation_policies(brand_id,bucket_name,bucket_type,allocation_pct,active,priority,notes)
 VALUES(${brandId},${name},${input.bucketType||"CUSTOM"},${pct},${Boolean(input.active)},${Number(input.priority)||100},${input.notes||null})
 ON CONFLICT(brand_id,bucket_name) DO UPDATE SET bucket_type=excluded.bucket_type,allocation_pct=excluded.allocation_pct,active=excluded.active,priority=excluded.priority,notes=excluded.notes,updated_at=now() RETURNING *`;return r[0];
}

export async function applyCashAllocationsForPayment(paymentId:string){
 const sql=db();const rows:any[]=await sql`SELECT py.id,py.amount,py.status,p.brand_id FROM wgos.payments py JOIN wgos.proposals p ON p.id=py.proposal_id WHERE py.id=${paymentId}::uuid LIMIT 1`;
 const py:any=rows[0];if(!py||!["PAID","SUCCEEDED","COMPLETED","SETTLED"].includes(String(py.status).toUpperCase()))return [];
 const policies:any[]=await sql`SELECT * FROM wgos.cash_allocation_policies WHERE brand_id=${py.brand_id} AND active=true AND allocation_pct>0 ORDER BY priority,bucket_name`;
 const totalPct=policies.reduce((n:number,x:any)=>n+Number(x.allocation_pct||0),0);if(totalPct>100)throw new Error("Active cash-envelope allocations exceed 100%.");
 const source=Math.round(Number(py.amount||0)*100),out:any[]=[];
 for(const p of policies){const amount=Math.round(source*Number(p.allocation_pct||0)/100);const r=await sql`INSERT INTO wgos.cash_allocations(brand_id,payment_id,policy_id,bucket_name,source_amount_cents,allocated_amount_cents,allocation_pct)
 VALUES(${py.brand_id},${py.id}::uuid,${p.id}::uuid,${p.bucket_name},${source},${amount},${Number(p.allocation_pct||0)})
 ON CONFLICT(payment_id,policy_id) DO UPDATE SET source_amount_cents=excluded.source_amount_cents,allocated_amount_cents=excluded.allocated_amount_cents,allocation_pct=excluded.allocation_pct,updated_at=now() RETURNING *`;out.push(r[0]);}
 return out;
}

export async function reconcileCashAllocations(brandId?:string){
 const sql=db();const rows:any[]=brandId
 ?await sql`SELECT py.id FROM wgos.payments py JOIN wgos.proposals p ON p.id=py.proposal_id WHERE p.brand_id=${brandId} AND upper(py.status) IN ('PAID','SUCCEEDED','COMPLETED','SETTLED')`
 :await sql`SELECT id FROM wgos.payments WHERE upper(status) IN ('PAID','SUCCEEDED','COMPLETED','SETTLED')`;
 for(const r of rows)await applyCashAllocationsForPayment(String(r.id));return rows.length;
}

import {NextResponse} from "next/server";
import {db} from "../../../../../lib/db";
import {requireApiUser,requireApiBrandAdmin} from "../../../../../lib/authz";

/**
 * Cutover remains disabled until an independently verified reconciliation,
 * an owner-approval record, and a transactional cutover workflow exist.
 * An ordinary business administrator and a confirmation string are insufficient.
 */
export async function PUT(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json();
  const brandId=typeof body?.brandId==="string"?body.brandId.trim():"";
  if(!brandId)return NextResponse.json({ok:false,error:"BUSINESS_REQUIRED"},{status:400});
  const access=await requireApiBrandAdmin(auth.identity,brandId);
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});

  const mode=typeof body?.mode==="string"?body.mode.trim():"";
  if(mode==="AUTHORITATIVE"){
   return NextResponse.json({ok:false,error:"OWNER_APPROVED_CUTOVER_WORKFLOW_REQUIRED"},{status:409});
  }
  if(mode!=="SHADOW"&&mode!=="READ_ONLY"){
   return NextResponse.json({ok:false,error:"INVALID_INVENTORY_MODE"},{status:400});
  }

  // A single SQL statement makes the state change and audit insertion atomic.
  // If either part fails, PostgreSQL rolls back the entire statement.
  const actor=String((auth.identity as any).auth_user_id||"");
  const sql=db();
  const updated:any[]=await sql`
   WITH changed AS (
    UPDATE wgos.inventory_control_state
       SET mode=${mode},updated_at=now()
     WHERE brand_id=${brandId}
     RETURNING brand_id,mode,source_of_truth,cutover_ready,reconciliation_status,
               last_reconciled_at,activated_at,activated_by,notes,updated_at
   ), logged AS (
    INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
    SELECT ${actor},'INVENTORY_CONTROL_MODE_UPDATED','brand',changed.brand_id,
           jsonb_build_object('mode',changed.mode)
      FROM changed
    RETURNING id
   )
   SELECT changed.* FROM changed JOIN logged ON true`;
  if(!updated.length)return NextResponse.json({ok:false,error:"INVENTORY_CONTROL_STATE_NOT_FOUND"},{status:404});
  return NextResponse.json({ok:true,state:updated[0]});
 }catch{
  // Do not disclose raw SQL, connection, or schema details in an API response.
  console.error("WGOS_INVENTORY_CONTROL_WRITE_FAILED");
  return NextResponse.json({ok:false,error:"INVENTORY_CONTROL_UNAVAILABLE"},{status:503});
 }
}

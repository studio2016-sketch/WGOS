import {NextResponse} from "next/server";
import {db} from "../../../../../lib/db";
import {requireApiUser,requireApiBrandAdmin} from "../../../../../lib/authz";

export async function PUT(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json();const brandId=String(body.brandId||"");const access=await requireApiBrandAdmin(auth.identity,brandId);
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const sql=db();const rows:any[]=await sql`SELECT * FROM wgos.inventory_control_state WHERE brand_id=${brandId} LIMIT 1`;const current=rows[0];
  if(!current)return NextResponse.json({ok:false,error:"INVENTORY_CONTROL_STATE_NOT_FOUND"},{status:404});
  const mode=String(body.mode||current.mode);
  if(mode==="AUTHORITATIVE"){
   if(current.reconciliation_status!=="APPROVED"||!current.cutover_ready)return NextResponse.json({ok:false,error:"INVENTORY_CUTOVER_NOT_READY"},{status:409});
   if(String(body.confirm||"")!=="ACTIVATE_INVENTORY_AUTHORITY")return NextResponse.json({ok:false,error:"EXPLICIT_CUTOVER_CONFIRMATION_REQUIRED"},{status:409});
  }
  if(!["SHADOW","READ_ONLY","AUTHORITATIVE"].includes(mode))return NextResponse.json({ok:false,error:"INVALID_INVENTORY_MODE"},{status:400});
  const updated:any[]=await sql`UPDATE wgos.inventory_control_state SET mode=${mode},activated_at=CASE WHEN ${mode}='AUTHORITATIVE' THEN now() ELSE activated_at END,activated_by=CASE WHEN ${mode}='AUTHORITATIVE' THEN ${String((auth.identity as any).auth_user_id)} ELSE activated_by END,updated_at=now() WHERE brand_id=${brandId} RETURNING *`;
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${String((auth.identity as any).auth_user_id)},'INVENTORY_CONTROL_MODE_UPDATED','brand',${brandId},jsonb_build_object('mode',${mode}::text))`;
  return NextResponse.json({ok:true,state:updated[0]});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update inventory control state"},{status:400});}
}

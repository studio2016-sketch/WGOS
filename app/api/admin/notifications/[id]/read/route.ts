import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../lib/authz";
import {db} from "../../../../../../lib/db";
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const {id}=await params;const sql=db();const rows:any[]=await sql`UPDATE wgos.notification_events SET status='READ' WHERE id=${id}::uuid AND status='PENDING' RETURNING id`;if(!rows[0])return NextResponse.json({ok:false,error:"NOTIFICATION_NOT_PENDING"},{status:409});await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${String((auth.identity as any).auth_user_id)},'NOTIFICATION_READ','notification',${id},'{}'::jsonb)`;return NextResponse.json({ok:true});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update notification"},{status:400});}
}
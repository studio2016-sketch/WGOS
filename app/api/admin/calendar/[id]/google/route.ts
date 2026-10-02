import {NextResponse} from "next/server";
import {requireApiBrand,requireApiUser} from "../../../../../../lib/authz";
import {syncCalendarEventToGoogle} from "../../../../../../lib/calendar";
import {db} from "../../../../../../lib/db";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;const sql=db();const rows:any[]=await sql`SELECT brand_id FROM wgos.calendar_events WHERE id=${id}::uuid LIMIT 1`;
  if(!rows[0])return NextResponse.json({ok:false,error:"Event not found"},{status:404});
  const access=await requireApiBrand(auth.identity,String(rows[0].brand_id));if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const event=await syncCalendarEventToGoogle({id,actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({ok:true,event},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to sync calendar event"},{status:400,headers:{"Cache-Control":"no-store, private"}})}
}
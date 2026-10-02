import {NextResponse} from "next/server";
import {requireApiBrand,requireApiUser} from "../../../../lib/authz";
import {createCalendarEvent} from "../../../../lib/calendar";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const body=await req.json(),brandId=String(body.brandId||"");const access=await requireApiBrand(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});const event=await createCalendarEvent({brandId,projectId:body.projectId?String(body.projectId):null,title:String(body.title||""),startAt:String(body.startAt||""),endAt:String(body.endAt||""),timezone:String(body.timezone||"UTC"),actor:String((auth.identity as any).auth_user_id)});return NextResponse.json({ok:true,event});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to create calendar event"},{status:400});}
}
import {NextResponse} from "next/server";
import {publicCheckoutStatus} from "../../../../../lib/payment-status";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
 try{
  const id=new URL(req.url).searchParams.get("session_id")||"";
  if(!id)return NextResponse.json({ok:false,error:"SESSION_REQUIRED"},{status:400,headers});
  const status=await publicCheckoutStatus(id);
  if(!status)return NextResponse.json({ok:false,error:"PAYMENT_SESSION_NOT_FOUND"},{status:404,headers});
  return NextResponse.json({ok:true,status},{headers});
 }catch{return NextResponse.json({ok:false,error:"PAYMENT_STATUS_UNAVAILABLE"},{status:503,headers});}
}
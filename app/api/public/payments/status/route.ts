import {NextResponse} from "next/server";
import {publicCheckoutStatus} from "../../../../../lib/payment-status";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
 try{
  const q=new URL(req.url).searchParams,id=q.get("session_id")||"",brand=q.get("brand")||undefined;
  if(!id)return NextResponse.json({ok:false,error:"SESSION_REQUIRED"},{status:400,headers});
  if(!brand)return NextResponse.json({ok:false,error:"BRAND_REQUIRED"},{status:400,headers});
  const status=await publicCheckoutStatus(id,brand);
  if(!status)return NextResponse.json({ok:false,error:"PAYMENT_SESSION_NOT_FOUND"},{status:404,headers});
  return NextResponse.json({ok:true,status},{headers});
 }catch{return NextResponse.json({ok:false,error:"PAYMENT_STATUS_UNAVAILABLE"},{status:503,headers});}
}
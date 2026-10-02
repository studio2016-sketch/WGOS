import {NextResponse} from "next/server";
import {submitPublicInquiry} from "../../../../lib/public-inquiry";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
 try{
  const body=await req.json();
  const result=await submitPublicInquiry({
   brandId:String(body?.brandId||""),name:String(body?.name||""),email:String(body?.email||""),
   phone:body?.phone?String(body.phone):"",organizationName:body?.organizationName?String(body.organizationName):"",
   title:body?.title?String(body.title):"",message:body?.message?String(body.message):"",
   details:body?.details&&typeof body.details==="object"?body.details:{},
   honeypot:body?.website?String(body.website):""
  });
  return NextResponse.json({ok:true,...result},{status:202,headers});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to receive inquiry"},{status:400,headers});
 }
}
import {NextResponse} from "next/server";
import {completeSignWellFromWebhook} from "../../../../lib/signature-completion";
import {signWellConfigured} from "../../../../lib/signwell";
export const runtime="nodejs";

export async function POST(req:Request){
 const headers={"Cache-Control":"no-store, private"};
 const raw=await req.text();
 let body:any;
 try{body=JSON.parse(raw)}catch{return NextResponse.json({received:false,error:"INVALID_JSON"},{status:400,headers})}
 const type=String(body?.event?.type||"");
 const eventId=String(body?.event?.hash||body?.event?.id||"");
 const documentId=String(body?.data?.object?.id||"");
 if(type!=="document_completed")return NextResponse.json({received:true,processed:false,eventType:type||"unknown"},{headers});
 if(!eventId||!documentId)return NextResponse.json({received:false,error:"MISSING_EVENT_CONTEXT"},{status:400,headers});
 if(!signWellConfigured())return NextResponse.json({received:false,error:"SIGNWELL_NOT_CONFIGURED"},{status:503,headers});
 try{
  const result=await completeSignWellFromWebhook({rawBody:raw,eventId,documentId});
  return NextResponse.json({received:true,...result},{headers});
 }catch(e){
  return NextResponse.json({received:true,processed:false,error:e instanceof Error?e.message:"SIGNATURE_VERIFICATION_FAILED"},{status:409,headers});
 }
}
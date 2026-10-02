import {NextResponse} from "next/server";
import {getPublicAgreement} from "../../../../../lib/agreement-access";
export const dynamic="force-dynamic";

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const token=new URL(req.url).searchParams.get("access")||"";
  const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
  if(!token)return NextResponse.json({ok:false,error:"CLIENT_ACCESS_REQUIRED"},{status:401,headers});
  const data=await getPublicAgreement(id,token);
  if(!data)return NextResponse.json({ok:false,error:"INVALID_OR_REVOKED_ACCESS"},{status:403,headers});
  return NextResponse.json({ok:true,...data},{headers});
 }catch{return NextResponse.json({ok:false,error:"UNABLE_TO_LOAD_AGREEMENT"},{status:400,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});}
}
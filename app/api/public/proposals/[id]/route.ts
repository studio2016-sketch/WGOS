import {NextResponse} from "next/server";
import {getPublicProposal} from "../../../../../lib/proposal-access";
export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const token=new URL(req.url).searchParams.get("access")||"";
  if(!token)return NextResponse.json({ok:false,error:"CLIENT_ACCESS_REQUIRED"},{status:401,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
  const data:any=await getPublicProposal(id,token);
  if(!data)return NextResponse.json({ok:false,error:"INVALID_OR_REVOKED_ACCESS"},{status:403,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
  const p=data.proposal;
  return NextResponse.json({ok:true,proposal:{id:p.id,version:p.version,status:p.status,currency:p.currency,one_time_total:p.one_time_total,monthly_total:p.monthly_total,deposit_amount:p.deposit_amount,brand_name:p.brand_name,opportunity_title:p.opportunity_title,organization_name:p.organization_name},sections:data.sections,items:data.items},{headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
 }catch{return NextResponse.json({ok:false,error:"UNABLE_TO_LOAD_PROPOSAL"},{status:400,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});}
}

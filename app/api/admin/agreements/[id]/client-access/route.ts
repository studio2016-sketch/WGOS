import {NextResponse} from "next/server";
import {requireApiAdmin,requireApiAgreement} from "../../../../../../../lib/authz";
import {issueAgreementAccess} from "../../../../../../../lib/agreement-access";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const access=await requireApiAgreement(auth.identity,id);
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const result=await issueAgreementAccess({agreementId:id,actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({ok:true,...result},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to issue agreement access"},{status:400,headers:{"Cache-Control":"no-store, private"}});}
}
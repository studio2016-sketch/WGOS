import {NextResponse} from "next/server";
import {requireApiUser,requireApiProposal} from "../../../../../../lib/authz";
import {issueProposalAccess} from "../../../../../../lib/proposal-access";
export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const {id}=await params;const access=await requireApiProposal(auth.identity,id);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const result=await issueProposalAccess({proposalId:id,actor:String((auth.identity as any).auth_user_id)});
 return NextResponse.json({ok:true,...result});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to issue client access"},{status:400});}
}

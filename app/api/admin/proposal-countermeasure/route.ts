import {NextResponse} from "next/server";
import {requireApiUser,requireApiProposal} from "../../../../lib/authz";
import {saveProposalCountermeasure,overrideProposalCountermeasure} from "../../../../lib/proposal-countermeasure";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json(),proposalId=String(b.proposalId||"");const access=await requireApiProposal(auth.identity,proposalId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});const actor=String((auth.identity as any).auth_user_id);
 const row=b.action==="override"?await overrideProposalCountermeasure({proposalId,reason:String(b.reason||""),actor}):await saveProposalCountermeasure({...b,proposalId,actor});return NextResponse.json({ok:true,row});}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to save countermeasure review"},{status:400});}
}

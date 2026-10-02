import {NextResponse} from "next/server";
import {validateProposalAccess} from "../../../../../../lib/proposal-access";
import {acceptProposalSnapshot} from "../../../../../../lib/commercial-lifecycle";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const body=await req.json();
  const token=String(body.access||"");if(!token)return NextResponse.json({ok:false,error:"CLIENT_ACCESS_REQUIRED"},{status:401,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
  const access:any=await validateProposalAccess(id,token);if(!access)return NextResponse.json({ok:false,error:"INVALID_OR_REVOKED_ACCESS"},{status:403,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
  const email=body.clientEmail?String(body.clientEmail).trim():null;
  const snapshot=await acceptProposalSnapshot({proposalId:id,clientEmail:email,actor:"client:proposal-token"});
  return NextResponse.json({ok:true,acceptedAt:snapshot.accepted_at,snapshotId:snapshot.id},{headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to accept proposal"},{status:400,headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});}
}

import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {initializeContractControl,createContractObligation,updateContractObligation,createTaskFromObligation,createContractDeliverable,createCrewBooking,createTimeEntry,createContractCost,createChangeOrder,createContractRecord} from "../../../../lib/contract-execution";

async function accessForControl(identity:any,controlId:string){const sql=db();const r=await sql`SELECT brand_id FROM wgos.contract_controls WHERE id=${controlId}::uuid LIMIT 1`;if(!r[0])return {ok:false,status:404,error:"Contract control not found"} as any;return requireApiBrandAdmin(identity,String((r[0] as any).brand_id));}
async function accessForAgreement(identity:any,agreementId:string){const sql=db();const r=await sql`SELECT p.brand_id FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id WHERE a.id=${agreementId}::uuid LIMIT 1`;if(!r[0])return {ok:false,status:404,error:"Agreement not found"} as any;return requireApiBrandAdmin(identity,String((r[0] as any).brand_id));}

export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const b=await req.json(),action=String(b.action||""),actor=String((auth.identity as any).auth_user_id);
  let access:any;
  if(action==="initialize")access=await accessForAgreement(auth.identity,String(b.agreementId||""));
  else access=await accessForControl(auth.identity,String(b.controlId||""));
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  let row:any;
  if(action==="initialize")row=await initializeContractControl({agreementId:String(b.agreementId),actor});
  else if(action==="obligation")row=await createContractObligation({...b,actor});
  else if(action==="obligation-status")row=await updateContractObligation({...b,actor});
  else if(action==="obligation-task")row=await createTaskFromObligation({obligationId:String(b.obligationId),actor});
  else if(action==="deliverable")row=await createContractDeliverable({...b,actor});
  else if(action==="crew")row=await createCrewBooking({...b,actor});
  else if(action==="time")row=await createTimeEntry({...b,actor});
  else if(action==="cost")row=await createContractCost({...b,actor});
  else if(action==="change-order")row=await createChangeOrder({...b,actor});
  else if(action==="record")row=await createContractRecord({...b,actor});
  else throw new Error("Unknown contract-control action.");
  return NextResponse.json({ok:true,row});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update contract control"},{status:400});}
}
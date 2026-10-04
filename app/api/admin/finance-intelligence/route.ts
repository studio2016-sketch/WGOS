import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {acceptBankMatch,rejectBankSuggestion,updateFinanceAlert,refreshFinanceIntelligence} from "../../../../lib/finance-intelligence";

export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const b=await req.json(),brandId=String(b.brandId||""),action=String(b.action||""),actor=String((auth.identity as any).auth_user_id);
  const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  let row:any;
  if(action==="refresh"){await refreshFinanceIntelligence(brandId);row={ok:true};}
  else if(action==="accept-match")row=await acceptBankMatch({...b,actor});
  else if(action==="reject-match")row=await rejectBankSuggestion({...b,actor});
  else if(action==="alert")row=await updateFinanceAlert({...b,actor});
  else throw new Error("Unknown finance intelligence action.");
  return NextResponse.json({ok:true,row});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update finance intelligence"},{status:400});}
}
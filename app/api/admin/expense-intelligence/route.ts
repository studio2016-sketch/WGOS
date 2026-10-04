import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {createExpenseClaim,createMileageClaim,updateClaimStatus,saveMileagePolicy,saveSpendBudget,createSpendRule,importBankTransaction,matchBankTransaction} from "../../../../lib/expense-intelligence";

export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const b=await req.json(),brandId=String(b.brandId||""),action=String(b.action||""),actor=String((auth.identity as any).auth_user_id);
  const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  let row:any;
  if(action==="expense")row=await createExpenseClaim({...b,actor});
  else if(action==="mileage")row=await createMileageClaim({...b,actor});
  else if(action==="claim-status")row=await updateClaimStatus({...b,actor});
  else if(action==="mileage-policy")row=await saveMileagePolicy({...b,actor});
  else if(action==="budget")row=await saveSpendBudget({...b,actor});
  else if(action==="spend-rule")row=await createSpendRule({...b,actor});
  else if(action==="bank-import")row=await importBankTransaction({...b,actor});
  else if(action==="bank-match")row=await matchBankTransaction({...b,actor});
  else throw new Error("Unknown expense intelligence action.");
  return NextResponse.json({ok:true,row});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update expense intelligence"},{status:400});}
}
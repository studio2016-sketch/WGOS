import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {updateAccountingEntityProfile,markAccountingProviderConnected,setAccountingSyncEnabled,reconcileAccountingActivationStates} from "../../../../lib/accounting-routing";

export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const b=await req.json(),brandId=String(b.brandId||""),action=String(b.action||""),actor=String((auth.identity as any).auth_user_id);
  const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  let row:any;
  if(action==="profile")row=await updateAccountingEntityProfile({...b,actor});
  else if(action==="connected")row=await markAccountingProviderConnected({...b,actor});
  else if(action==="sync")row=await setAccountingSyncEnabled({...b,actor,enabled:Boolean(b.enabled)});
  else if(action==="reconcile"){await reconcileAccountingActivationStates(actor);row={ok:true};}
  else throw new Error("Unknown accounting routing action.");
  return NextResponse.json({ok:true,row});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update accounting routing"},{status:400});}
}
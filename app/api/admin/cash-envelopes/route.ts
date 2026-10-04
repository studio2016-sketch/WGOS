import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {saveCashAllocationPolicy,reconcileCashAllocations} from "../../../../lib/cash-envelopes";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json(),brandId=String(b.brandId||""),action=String(b.action||"");const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});let row:any;
 if(action==="policy")row=await saveCashAllocationPolicy(b);else if(action==="reconcile"){await reconcileCashAllocations(brandId);row={ok:true};}else throw new Error("Unknown cash allocation action.");
 return NextResponse.json({ok:true,row});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update cash envelopes"},{status:400});}
}
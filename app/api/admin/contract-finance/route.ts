import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {createVendorProfile,createPurchaseOrder,updatePurchaseOrder,addLedgerAdjustment,queueAccountingSync} from "../../../../lib/contract-finance";

async function brandForControl(controlId:string){const sql=db();const r=await sql`SELECT brand_id FROM wgos.contract_controls WHERE id=${controlId}::uuid LIMIT 1`;return r[0]?String((r[0] as any).brand_id):null;}

export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const b=await req.json(),action=String(b.action||""),actor=String((auth.identity as any).auth_user_id);
  let brandId=String(b.brandId||"");
  if(!brandId&&b.controlId)brandId=String(await brandForControl(String(b.controlId))||"");
  if(!brandId)return NextResponse.json({ok:false,error:"Brand not found"},{status:404});
  const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  let row:any;
  if(action==="vendor")row=await createVendorProfile({...b,brandId,actor});
  else if(action==="purchase-order")row=await createPurchaseOrder({...b,actor});
  else if(action==="purchase-order-status")row=await updatePurchaseOrder({...b,actor});
  else if(action==="ledger")row=await addLedgerAdjustment({...b,actor});
  else if(action==="queue-sync")row=await queueAccountingSync({...b,actor});
  else throw new Error("Unknown contract finance action.");
  return NextResponse.json({ok:true,row});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update contract finance"},{status:400});}
}
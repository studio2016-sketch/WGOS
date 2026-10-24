import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../../lib/authz";
import {adjustInventory} from "../../../../../lib/inventory";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const body=await req.json();const brandId=String(body.brandId||"");const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const result=await adjustInventory({brandId,productId:String(body.productId||""),locationId:String(body.locationId||""),quantityDelta:Number(body.quantityDelta),movementType:String(body.movementType||"ADJUSTMENT"),notes:String(body.notes||""),actor:String((auth.identity as any).auth_user_id),idempotencyKey:body.idempotencyKey?String(body.idempotencyKey):undefined});
 return NextResponse.json({ok:true,result});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to adjust inventory"},{status:400});}
}

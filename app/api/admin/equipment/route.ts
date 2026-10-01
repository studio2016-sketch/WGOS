import {NextResponse} from "next/server";
import {requireApiBrand,requireApiUser} from "../../../../lib/authz";
import {createEquipmentAsset} from "../../../../lib/resources";

export async function POST(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{const body=await req.json();const brandId=String(body.brandId||"");const access=await requireApiBrand(auth.identity,brandId);if(!access.ok)return NextResponse.json({created:false,error:access.error},{status:access.status});const asset=await createEquipmentAsset({brandId,category:String(body.category||""),manufacturer:String(body.manufacturer||""),model:String(body.model||""),assetTag:String(body.assetTag||""),serialNumber:String(body.serialNumber||""),locationText:String(body.locationText||""),replacementValueCents:Math.round(Number(body.replacementValue||0)*100),actor:String((auth.identity as any).auth_user_id)});return NextResponse.json({created:true,asset});}catch(e){return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to create equipment asset"},{status:400});}
}

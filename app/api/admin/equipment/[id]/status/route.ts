import {NextResponse} from "next/server";
import {requireApiEquipment,requireApiUser} from "../../../../../../lib/authz";
import {updateEquipmentStatus} from "../../../../../../lib/resources";

export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({updated:false,error:auth.error},{status:auth.status});
 try{const {id}=await params;const access=await requireApiEquipment(auth.identity,id);if(!access.ok)return NextResponse.json({updated:false,error:access.error},{status:access.status});const body=await req.json();const asset=await updateEquipmentStatus({assetId:id,status:String(body.status||""),actor:String((auth.identity as any).auth_user_id)});return NextResponse.json({updated:true,asset});}catch(e){return NextResponse.json({updated:false,error:e instanceof Error?e.message:"Unable to update equipment"},{status:400});}
}

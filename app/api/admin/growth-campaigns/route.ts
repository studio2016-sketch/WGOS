import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {createGrowthCampaign,createGrowthLink} from "../../../../lib/growth-attribution";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json();const brandId=String(b.brandId||"");const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const actor=String((auth.identity as any).auth_user_id);
 const row=b.kind==="link"?await createGrowthLink({...b,brandId,actor}):await createGrowthCampaign({...b,brandId,actor});
 return NextResponse.json({ok:true,row});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to save growth campaign"},{status:400});}
}

import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {createGrowthMetric} from "../../../../lib/growth-metrics";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json();const brandId=String(b.brandId||"");const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const row=await createGrowthMetric({...b,brandId,actor:String((auth.identity as any).auth_user_id)});return NextResponse.json({ok:true,row});}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to save metrics"},{status:400});}
}
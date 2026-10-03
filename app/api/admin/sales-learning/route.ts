import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {recordLearningEvent,upsertDealReview} from "../../../../lib/sales-learning";
import {db} from "../../../../lib/db";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const b=await req.json();const opportunityId=String(b.opportunityId||"");const sql=db();const rows=await sql`SELECT brand_id FROM wgos.opportunities WHERE id=${opportunityId}::uuid LIMIT 1`;if(!rows[0])return NextResponse.json({ok:false,error:"Opportunity not found"},{status:404});
 const access=await requireApiBrandAdmin(auth.identity,String((rows[0] as any).brand_id));if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const actor=String((auth.identity as any).auth_user_id);const row=b.kind==="review"?await upsertDealReview({...b,opportunityId,actor,wouldPursueAgain:b.wouldPursueAgain==="true"?true:b.wouldPursueAgain==="false"?false:null}):await recordLearningEvent({...b,opportunityId,actor});
 return NextResponse.json({ok:true,row});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to save sales learning"},{status:400});}
}

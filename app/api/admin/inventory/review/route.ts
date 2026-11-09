import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../../lib/authz";
import {db} from "../../../../../lib/db";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 const body=await req.json().catch(()=>null);
 if(!body)return NextResponse.json({error:"Invalid review."},{status:400});
 const access=await requireApiBrandAdmin(auth.identity,String(body.brandId||""));
 if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
 try{
  const rows=await db()`SELECT wgos.review_inventory_product(${JSON.stringify(body)}::jsonb,${String(auth.identity.auth_user_id)}) AS result`;
  return NextResponse.json(rows[0].result);
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Review could not be saved."},{status:409});
 }
}

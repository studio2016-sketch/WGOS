import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private"};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 const secret=process.env.BOUTIQUE_ORDER_SYNC_SECRET;
 const supplied=req.headers.get("authorization")||"";
 const expected="Bearer "+secret;
 if(!secret||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||
  !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))
  return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 const raw=await req.text();
 if(Buffer.byteLength(raw)>8192)return NextResponse.json({error:"Request too large"},{status:413,headers});
 let data:any;try{data=JSON.parse(raw)}catch{return NextResponse.json({error:"Malformed request"},{status:400,headers})}
 try{
  const sql=db();
  let result:any;
  if(data?.action==="reserve"){
   if(typeof data.requestId!=="string"||!uuid.test(data.requestId)||!Array.isArray(data.lines))
    return NextResponse.json({error:"Invalid reservation"},{status:400,headers});
   const rows=await sql`SELECT wgos.boutique_reserve_cart(${JSON.stringify(data.lines)}::jsonb,${data.requestId}::uuid) AS result`;
   result=rows[0]?.result;
  }else if(data?.action==="attach"){
   if(typeof data.id!=="string"||!uuid.test(data.id)||typeof data.sessionId!=="string"||
    !/^cs_live_[A-Za-z0-9]+$/.test(data.sessionId))
    return NextResponse.json({error:"Invalid checkout session"},{status:400,headers});
   const rows=await sql`SELECT wgos.boutique_attach_checkout_session(${data.id}::uuid,${data.sessionId}) AS result`;
   result=rows[0]?.result;
  }else if(data?.action==="release"){
   if(typeof data.id!=="string"||!uuid.test(data.id))
    return NextResponse.json({error:"Invalid reservation"},{status:400,headers});
   const rows=await sql`SELECT wgos.boutique_release_checkout_reservation(${data.id}::uuid) AS result`;
   result=rows[0]?.result;
  }else return NextResponse.json({error:"Unsupported action"},{status:400,headers});
  return NextResponse.json(result||{error:"Operation unavailable"},{status:result?200:503,headers});
 }catch(error){
  // Fail closed on inventory races, invalid stock or unapproved catalog status.
  console.error("Boutique inventory hold rejected",error instanceof Error?error.message:"unknown");
  return NextResponse.json({error:"Unable to confirm current inventory."},{status:409,headers});
 }
}

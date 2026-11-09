import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
export const runtime="nodejs";
export async function POST(req:Request){
 const secret=process.env.BOUTIQUE_ORDER_SYNC_SECRET;
 const supplied=req.headers.get("authorization")||"";
 const expected="Bearer "+secret;
 if(!secret||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))
  return NextResponse.json({error:"Unauthorized."},{status:401});
 const raw=await req.text();
 if(Buffer.byteLength(raw)>65536)return NextResponse.json({error:"Order too large."},{status:413});
 try{
  const payload=JSON.parse(raw);
  const sql=db();
  const rows=await sql`SELECT wgos.record_boutique_order(${JSON.stringify(payload)}::jsonb) AS result`;
  return NextResponse.json(rows[0].result,{headers:{"Cache-Control":"no-store, private"}});
 }catch{
  return NextResponse.json({error:"Order recording failed. Retry delivery."},{status:500});
 }
}

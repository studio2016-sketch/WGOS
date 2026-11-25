import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private"};
export async function GET(req:Request){
 const secret=process.env.BOUTIQUE_ORDER_SYNC_SECRET;
 const supplied=req.headers.get("authorization")||"";
 const expected="Bearer "+secret;
 if(!secret||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||
  !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))
  return NextResponse.json({error:"Unauthorized"},{status:401,headers});
 try{
  const rows=await db()`SELECT logo_url,pixel_width,pixel_height
    FROM wgos.boutique_brand_assets WHERE brand_id='dionnesBoutique' LIMIT 1`;
  const item=rows[0];
  const url=item?.logo_url||null;
  if(url){
   const parsed=new URL(url);
   if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".blob.vercel-storage.com"))
    throw Error("Logo storage URL not permitted");
  }
  return NextResponse.json({logoUrl:url,width:item?.pixel_width??null,height:item?.pixel_height??null},{headers});
 }catch{return NextResponse.json({error:"Brand asset unavailable"},{status:503,headers})}
}

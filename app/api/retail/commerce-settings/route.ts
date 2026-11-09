import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {boutiqueSettings} from "../../../../lib/boutique-settings";
export async function GET(req:Request){
 const secret=process.env.BOUTIQUE_ORDER_SYNC_SECRET,supplied=req.headers.get("authorization")||"",expected="Bearer "+secret;
 if(!secret||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return NextResponse.json({error:"Unauthorized."},{status:401});
 try{return NextResponse.json(await boutiqueSettings(),{headers:{"Cache-Control":"no-store, private"}});}
 catch{return NextResponse.json({error:"Settings unavailable."},{status:503});}
}

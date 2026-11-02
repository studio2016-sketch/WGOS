import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../../lib/authz";
import {galleryPhotos,saveGalleryPhoto} from "../../../../../lib/inventory-gallery";
export async function GET(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 const url=new URL(req.url),brandId=url.searchParams.get("brandId")||"",productId=url.searchParams.get("productId")||"";
 const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
 try{return NextResponse.json({ok:true,photos:await galleryPhotos(brandId,productId)})}catch{return NextResponse.json({error:"GALLERY_UNAVAILABLE"},{status:503})}
}
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 try{
  const body=await req.json(),brandId=String(body.brandId||"");
  const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
  const photo=await saveGalleryPhoto({brandId,productId:String(body.productId||""),url:String(body.url||""),altText:String(body.altText||""),actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({ok:true,photo});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"GALLERY_SAVE_FAILED"},{status:400})}
}

import {NextResponse} from "next/server";
import {put} from "@vercel/blob";
import {requireApiUser,requireApiBrandAdmin} from "../../../../../lib/authz";

export const runtime="nodejs";
const MAX_BYTES=8*1024*1024;
const types=new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"],["image/avif","avif"]]);

export async function POST(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 const contentType=req.headers.get("content-type")||"";
 if(!contentType.includes("multipart/form-data"))return NextResponse.json({ok:false,error:"MULTIPART_REQUIRED"},{status:415});
 const form=await req.formData();
 const brandId=String(form.get("brandId")||"");
 const access=await requireApiBrandAdmin(auth.identity,brandId);
 if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 if(brandId!=="dionnesBoutique")return NextResponse.json({ok:false,error:"BRAND_NOT_SUPPORTED"},{status:400});
 const file=form.get("image");
 if(!(file instanceof File))return NextResponse.json({ok:false,error:"IMAGE_REQUIRED"},{status:400});
 const extension=types.get(file.type);
 if(!extension||file.size===0||file.size>MAX_BYTES)return NextResponse.json({ok:false,error:"Upload a JPG, PNG, WebP, or AVIF image up to 8 MB."},{status:400});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return NextResponse.json({ok:false,error:"IMAGE_STORAGE_NOT_CONFIGURED"},{status:503});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const signature=extension==="jpg"?bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff:extension==="png"?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:extension==="webp"?String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP":String.fromCharCode(...bytes.slice(4,8))==="ftyp";
 if(!signature)return NextResponse.json({ok:false,error:"INVALID_IMAGE_FILE"},{status:400});
 try{
  const uploaded=await put(`inventory/${brandId}/${crypto.randomUUID()}.${extension}`,bytes,{access:"public",contentType:file.type,addRandomSuffix:false});
  return NextResponse.json({ok:true,url:uploaded.url},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"IMAGE_UPLOAD_FAILED"},{status:502})}
}

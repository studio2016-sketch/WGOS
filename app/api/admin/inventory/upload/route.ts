import {NextResponse} from "next/server";
import {put} from "@vercel/blob";
import sharp from "sharp";
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
 if(!["dionnesBoutique","bassOne"].includes(brandId))return NextResponse.json({ok:false,error:"BRAND_NOT_SUPPORTED"},{status:400});
 const file=form.get("image");
 if(!(file instanceof File))return NextResponse.json({ok:false,error:"IMAGE_REQUIRED"},{status:400});
 const extension=types.get(file.type);
 if(!extension||file.size===0||file.size>MAX_BYTES)return NextResponse.json({ok:false,error:"Upload a JPG, PNG, WebP, or AVIF image up to 8 MB."},{status:400});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return NextResponse.json({ok:false,error:"IMAGE_STORAGE_NOT_CONFIGURED"},{status:503});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const signature=extension==="jpg"?bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff:extension==="png"?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:extension==="webp"?String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP":String.fromCharCode(...bytes.slice(4,8))==="ftyp";
 if(!signature)return NextResponse.json({ok:false,error:"INVALID_IMAGE_FILE"},{status:400});
 try{
  const input=sharp(Buffer.from(bytes),{limitInputPixels:40000000,failOn:"error"});
  const metadata=await input.metadata();
  if(!metadata.width||!metadata.height||metadata.width<160||metadata.height<160)return NextResponse.json({ok:false,error:"IMAGE_RESOLUTION_TOO_LOW"},{status:400});
  const imageId=crypto.randomUUID();
  const variants=[{name:"thumbnail",width:320,quality:78},{name:"product",width:800,quality:84},{name:"zoom",width:1600,quality:88}];
  const images:Record<string,string>={};
  for(const variant of variants){
   const output=await sharp(Buffer.from(bytes),{limitInputPixels:40000000,failOn:"error"}).rotate().resize({width:variant.width,height:variant.width,fit:"inside",withoutEnlargement:true}).webp({quality:variant.quality,effort:4}).toBuffer();
   const uploaded=await put(`inventory/${brandId}/${imageId}-${variant.name}.webp`,output,{access:"public",contentType:"image/webp",addRandomSuffix:false});
   images[variant.name]=uploaded.url;
  }
  return NextResponse.json({ok:true,url:images.product,images,format:"webp"},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"IMAGE_UPLOAD_FAILED"},{status:502})}
}

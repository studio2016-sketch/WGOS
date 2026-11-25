import {createHash,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {db} from "../../../../lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private"};
const brandId="dionnesBoutique";
async function authorize(){
 const user=await requireApiUser();
 if(!user.ok)return {ok:false as const,status:user.status,error:user.error};
 const brand=await requireApiBrandAdmin(user.identity,brandId);
 if(!brand.ok)return {ok:false as const,status:brand.status,error:brand.error};
 return {ok:true as const,userId:String(user.identity.auth_user_id)};
}
export async function GET(){
 const auth=await authorize();
 if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 try{
  const rows=await db()`SELECT logo_url,pixel_width,pixel_height,updated_at
   FROM wgos.boutique_brand_assets WHERE brand_id=${brandId} LIMIT 1`;
  const row=rows[0];
  return NextResponse.json({
   logoUrl:row?.logo_url??null,width:row?.pixel_width??null,
   height:row?.pixel_height??null,updatedAt:row?.updated_at??null
  },{headers});
 }catch{return NextResponse.json({error:"Brand artwork unavailable."},{status:503,headers})}
}
export async function POST(request:Request){
 const auth=await authorize();
 if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))
  return NextResponse.json({error:"Select the approved PNG file."},{status:415,headers});
 const claimedSize=Number(request.headers.get("content-length")||0);
 if(claimedSize>3300000)return NextResponse.json({error:"PNG must be 3 MB or smaller."},{status:413,headers});
 let file:File;
 try{
  const form=await request.formData();
  const value=form.get("logo");
  if(!(value instanceof File))throw Error("No file");
  file=value;
 }catch{return NextResponse.json({error:"Please select a PNG image."},{status:400,headers})}
 if(file.size<1024||file.size>3000000||file.type!=="image/png")
  return NextResponse.json({error:"The official logo must be a PNG of 3 MB or less."},{status:400,headers});
 const bytes=Buffer.from(await file.arrayBuffer());
 const signature="89504e470d0a1a0a";
 if(bytes.length<33||bytes.subarray(0,8).toString("hex")!==signature||bytes.toString("ascii",12,16)!=="IHDR")
  return NextResponse.json({error:"The selected file is not a valid PNG."},{status:400,headers});
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),bitDepth=bytes[24],colorType=bytes[25];
 if(width<700||width>4096||height<400||height>4096||bitDepth!==8||colorType!==6)
  return NextResponse.json({error:"Use the original high-resolution transparent RGBA PNG."},{status:400,headers});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token)return NextResponse.json({error:"WGOS brand image storage is not configured."},{status:503,headers});
 const sha256=createHash("sha256").update(bytes).digest("hex");
 const pathname="dionnes-boutique/official-logo-"+sha256.slice(0,14)+"-"+randomUUID()+".png";
 let uploaded:any;
 try{
  const endpoint="https://blob.vercel-storage.com/?"+new URLSearchParams({pathname});
  const r=await fetch(endpoint,{
   method:"PUT",headers:{
    authorization:"Bearer "+token,
    "x-api-version":"13",
    "x-content-type":"image/png",
    "x-vercel-blob-access":"public",
    "x-add-random-suffix":"0",
    "x-content-length":String(bytes.length)
   },body:bytes,signal:AbortSignal.timeout(25000)
  });
  if(!r.ok)throw Error("Image storage rejected the upload: "+r.status);
  uploaded=await r.json();
  const url=new URL(String(uploaded.url||""));
  if(url.protocol!=="https:"||!url.hostname.endsWith(".blob.vercel-storage.com"))
   throw Error("Image storage returned an invalid URL");
 }catch(error){
  console.error("WGOS_BOUTIQUE_LOGO_UPLOAD_FAILED",error instanceof Error?error.message:"unknown");
  return NextResponse.json({error:"Official logo upload failed. Confirm WGOS has a public Vercel Blob store."},{status:502,headers});
 }
 try{
  const rows=await db()`INSERT INTO wgos.boutique_brand_assets
   (brand_id,logo_url,logo_pathname,file_sha256,pixel_width,pixel_height,modified_by,updated_at)
   VALUES (${brandId},${String(uploaded.url)},${pathname},${sha256},${width},${height},${auth.userId},now())
   ON CONFLICT(brand_id) DO UPDATE SET logo_url=EXCLUDED.logo_url,
    logo_pathname=EXCLUDED.logo_pathname,file_sha256=EXCLUDED.file_sha256,
    pixel_width=EXCLUDED.pixel_width,pixel_height=EXCLUDED.pixel_height,
    modified_by=EXCLUDED.modified_by,updated_at=EXCLUDED.updated_at
   RETURNING logo_url,updated_at`;
  await db()`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
   VALUES(${auth.userId},'BOUTIQUE_OFFICIAL_LOGO_UPLOADED','brand',${brandId},
   jsonb_build_object('sha256',${sha256}::text,'pixelWidth',${width}::int,'pixelHeight',${height}::int))`;
  return NextResponse.json({ok:true,logoUrl:rows[0]?.logo_url,width,height},{headers});
 }catch{
  return NextResponse.json({error:"The image was uploaded but could not be activated in WGOS. Contact an administrator."},{status:500,headers});
 }
}

import {createHash,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {db} from "../../../../lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private"};
function dimensions(bytes:Buffer,mime:string):{width:number;height:number}|null{
 if(mime==="image/png"){
  if(bytes.length<33||bytes.subarray(0,8).toString("hex")!=="89504e470d0a1a0a"||bytes.toString("ascii",12,16)!=="IHDR")return null;
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 }
 if(mime==="image/jpeg"){
  if(bytes.length<18||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff)return null;
  let position=2;
  while(position+9<bytes.length){
   if(bytes[position]!==0xff){position++;continue}
   while(bytes[position]===0xff)position++;
   const marker=bytes[position++];
   if(marker===0xd9||marker===0xda)break;
   if(marker>=0xd0&&marker<=0xd7)continue;
   if(position+2>bytes.length)break;
   const length=bytes.readUInt16BE(position);
   if(length<2||position+length>bytes.length)break;
   if([0xc0,0xc1,0xc2,0xc3].includes(marker)&&length>=7){
    return {height:bytes.readUInt16BE(position+3),width:bytes.readUInt16BE(position+5)};
   }
   position+=length;
  }
 }
 return null;
}
export async function POST(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status,headers});
 const permission=await requireApiBrandAdmin(auth.identity,"dionnesBoutique");
 if(!permission.ok)return NextResponse.json({error:permission.error},{status:permission.status,headers});
 if(!req.headers.get("content-type")?.startsWith("multipart/form-data"))
  return NextResponse.json({error:"A JPEG or PNG photograph is required."},{status:415,headers});
 if(Number(req.headers.get("content-length")||0)>4200000)
  return NextResponse.json({error:"Photograph must be under 4 MB."},{status:413,headers});
 let file:File,sourceId:number;
 try{
  const form=await req.formData();
  const item=form.get("photo"),id=Number(form.get("productId"));
  if(!(item instanceof File)||!Number.isSafeInteger(id)||id<1||id>69)throw Error("Invalid product photo");
  file=item;sourceId=id;
 }catch{return NextResponse.json({error:"Choose a product and a valid photograph."},{status:400,headers})}
 if(!["image/png","image/jpeg"].includes(file.type)||file.size<1024||file.size>4000000)
  return NextResponse.json({error:"Upload a clear PNG or JPEG under 4 MB."},{status:400,headers});
 const bytes=Buffer.from(await file.arrayBuffer());
 const size=dimensions(bytes,file.type);
 if(!size||size.width<700||size.height<700||size.width>6000||size.height>6000)
  return NextResponse.json({error:"Use a high-resolution photograph at least 700×700 pixels."},{status:400,headers});
 const id="DIONNES_CATALOG:"+sourceId;
 const sql=db();
 const before=await sql`SELECT id,product_name,variant_name FROM wgos.inventory_products
  WHERE brand_id='dionnesBoutique' AND external_key=${id} LIMIT 1`;
 if(!before[0])return NextResponse.json({error:"Product no longer matches the boutique catalog."},{status:404,headers});
 const token=process.env.BLOB_READ_WRITE_TOKEN;
 if(!token)return NextResponse.json({error:"Image storage is not connected."},{status:503,headers});
 const sha=createHash("sha256").update(bytes).digest("hex"),ext=file.type==="image/png"?"png":"jpg";
 const pathname="dionnes-boutique/catalog/DB-"+sourceId+"-"+sha.slice(0,14)+"-"+randomUUID()+"."+ext;
 let url:string;
 try{
  const response=await fetch("https://blob.vercel-storage.com/?"+new URLSearchParams({pathname}),{
   method:"PUT",headers:{
    authorization:"Bearer "+token,"x-api-version":"13",
    "x-content-type":file.type,"x-vercel-blob-access":"public",
    "x-add-random-suffix":"0","x-content-length":String(bytes.length)
   },body:bytes,signal:AbortSignal.timeout(30000)
  });
  if(!response.ok)throw Error("Upload refused "+response.status);
  const result=await response.json();
  url=String(result.url||"");
  const parsed=new URL(url);
  if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".blob.vercel-storage.com"))throw Error("Invalid image host");
 }catch(error){
  console.error("BOUTIQUE_PRODUCT_PHOTO_UPLOAD_FAILED",error instanceof Error?error.message:"unknown");
  return NextResponse.json({error:"Unable to upload the photo to WGOS storage."},{status:502,headers});
 }
 try{
  const changed=await sql`UPDATE wgos.inventory_products SET image_url=${url},
   metadata=COALESCE(metadata,'{}'::jsonb)||
    jsonb_build_object('approvedPhoto',true,'approvedPhotoHash',${sha}::text,
     'photoWidth',${size.width}::int,'photoHeight',${size.height}::int,'photoApprovedAt',now()::text),
   updated_at=now()
   WHERE brand_id='dionnesBoutique' AND external_key=${id}
   RETURNING id`;
  if(!changed[0])throw Error("Catalog update rejected");
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
    VALUES(${String(auth.identity.auth_user_id)},'BOUTIQUE_PRODUCT_PHOTO_APPROVED','inventory_product',
    ${String(changed[0].id)},jsonb_build_object('catalogId',${sourceId}::int,'sha256',${sha}::text))`;
  return NextResponse.json({ok:true,photoUrl:url,width:size.width,height:size.height},{headers});
 }catch{return NextResponse.json({error:"Photo uploaded but the catalog could not be updated."},{status:500,headers})}
}

import "server-only";
import {db} from "./db";
export async function galleryPhotos(brandId:string,productId:string){
 const sql=db();
 return await sql`SELECT id,product_id,image_url,alt_text,sort_order,is_primary FROM wgos.inventory_product_images WHERE brand_id=${brandId} AND product_id=${productId}::uuid ORDER BY sort_order,id`;
}
export async function saveGalleryPhoto(input:{brandId:string;productId:string;url:string;altText?:string;actor:string}){
 const sql=db();
 const product=await sql`SELECT id FROM wgos.inventory_products WHERE id=${input.productId}::uuid AND brand_id=${input.brandId} LIMIT 1`;
 if(!product.length)throw new Error("PRODUCT_NOT_FOUND");
 if(!/^https:\/\//.test(input.url)||input.url.length>2048)throw new Error("INVALID_IMAGE_URL");
 const existing=await sql`SELECT count(*)::int AS total FROM wgos.inventory_product_images WHERE brand_id=${input.brandId} AND product_id=${input.productId}::uuid`;
 if(Number(existing[0]?.total||0)>=20)throw new Error("GALLERY_LIMIT_REACHED");
 const rows=await sql`INSERT INTO wgos.inventory_product_images(brand_id,product_id,image_url,alt_text,sort_order,is_primary) VALUES(${input.brandId},${input.productId}::uuid,${input.url},${input.altText||""},${Number(existing[0]?.total||0)},${Number(existing[0]?.total||0)===0}) RETURNING *`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'INVENTORY_GALLERY_PHOTO_ADDED','inventory_product',${input.productId},jsonb_build_object('brandId',${input.brandId}::text))`;
 return rows[0];
}

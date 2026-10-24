import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {createInventoryProduct,updateInventoryProduct} from "../../../../lib/inventory";
export async function POST(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const body=await req.json();const brandId=String(body.brandId||"");const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const product=await createInventoryProduct({brandId,externalKey:body.externalKey,sku:body.sku,category:body.category,manufacturer:body.manufacturer,productName:String(body.productName||""),variantName:body.variantName,conditionStatus:body.conditionStatus,priceCents:Math.round(Number(body.price||0)*100),costCents:body.cost==null?null:Math.round(Number(body.cost)*100),imageUrl:body.imageUrl,sellable:Boolean(body.sellable),actor:String((auth.identity as any).auth_user_id)});
 return NextResponse.json({ok:true,product});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to create inventory product"},{status:400});}
}
export async function PUT(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const body=await req.json();const brandId=String(body.brandId||"");const access=await requireApiBrandAdmin(auth.identity,brandId);if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
 const product=await updateInventoryProduct({brandId,productId:String(body.productId||""),priceCents:body.price===undefined?undefined:Math.round(Number(body.price||0)*100),costCents:body.cost===undefined?undefined:(body.cost==null?null:Math.round(Number(body.cost||0)*100)),sellable:body.sellable,active:body.active,imageUrl:body.imageUrl,actor:String((auth.identity as any).auth_user_id)});
 return NextResponse.json({ok:true,product});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to update inventory product"},{status:400});}
}

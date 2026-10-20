import {NextResponse} from "next/server";
import {requireApiUser,canManageBrand} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
export async function POST(request:Request){
 const access=await requireApiUser();
 if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
 let input:any;
 try{input=await request.json();}catch{return NextResponse.json({error:"INVALID_JSON"},{status:400});}
 const brandId=String(input.brandId||"");
 if(!brandId||!await canManageBrand(access.identity,brandId))return NextResponse.json({error:"BRAND_MANAGEMENT_REQUIRED"},{status:403});
 const sku=String(input.sku||"").trim().toUpperCase(),name=String(input.name||"").trim();
 const kind=input.kind==="SERVICE"?"SERVICE":"PRODUCT";
 const qty=kind==="SERVICE"?null:Number(input.qty);
 const cents=(value:unknown)=>Math.round(Number(value)*100);
 const cost=cents(input.cost||0),retail=cents(input.retail||0),sale=input.sale===""||input.sale==null?null:cents(input.sale);
 if(!sku||sku.length>80||!name||name.length>240||
    (kind==="PRODUCT"&&(!Number.isInteger(qty)||qty<0))||
    ![cost,retail,...(sale===null?[]:[sale])].every(n=>Number.isSafeInteger(n)&&n>=0)||
    (sale!==null&&sale>retail))
  return NextResponse.json({error:"INVALID_CATALOG_INPUT"},{status:400});
 try{
  const sql=db();
  const rows:any[]=await sql`INSERT INTO wgos.catalog_items
   (brand_id,kind,sku,name,description,category,image_url,quantity,wholesale_cents,retail_cents,sale_cents,status)
   VALUES(${brandId},${kind},${sku},${name},
   ${String(input.description||"").slice(0,5000)},${String(input.category||"").slice(0,120)},
   ${String(input.image||"").slice(0,2000)||null},${qty},
   ${cost},${retail},${sale},'DRAFT') RETURNING id,brand_id,sku,status`;
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
   VALUES(${String(access.identity.auth_user_id)},'CATALOG_DRAFT_CREATED','catalog_item',${String(rows[0].id)},
    ${JSON.stringify({brand_id:brandId,sku})}::jsonb)`;
  return NextResponse.json({item:rows[0]},{status:201});
 }catch(e){
  console.error("CATALOG_DRAFT_SAVE_FAILED",e instanceof Error?e.message:"unknown");
  return NextResponse.json({error:"CATALOG_SAVE_UNAVAILABLE"},{status:503});
 }
}

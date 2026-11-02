import {NextRequest,NextResponse} from "next/server";
import {requireApiAdmin,requireApiBrandAdmin} from "../../../../../lib/authz";
import {db} from "../../../../../lib/db";
import snapshot from "../../../../admin/boutique/catalog-snapshot.json";
const known=new Set(snapshot.map(x=>x.sku));
function response(error:string,status:number){return NextResponse.json({error},{status});}
async function authorized(brand:string){
 const access=await requireApiAdmin();
 if(!access.ok)return {error:response(access.error,access.status)};
 const grant=await requireApiBrandAdmin(access.identity,brand);
 if(!grant.ok)return {error:response(grant.error,grant.status)};
 const sql=db();
 const names=await sql`select name from wgos.brands where id=${brand}::uuid limit 1`;
 if(!names.length||!/dionne/i.test(String(names[0].name)))return {error:response("BOUTIQUE_BRAND_REQUIRED",403)};
 return {sql,actor:String(access.identity.auth_user_id)};
}
export async function GET(request:NextRequest){
 const brand=request.nextUrl.searchParams.get("brand")||"";
 if(!/^[0-9a-f-]{36}$/i.test(brand))return response("INVALID_BRAND",400);
 const auth=await authorized(brand);if(auth.error)return auth.error;
 try {
 const rows=await auth.sql!`select sku,stock,price_cents,revision from wgos.boutique_inventory_drafts where brand_id=${brand}::uuid order by sku`;
 return NextResponse.json({drafts:rows,authoritative:false});
 }catch{return response("DRAFT_STORAGE_UNAVAILABLE",503);}
}
export async function PATCH(request:NextRequest){
 const brand=request.nextUrl.searchParams.get("brand")||"";
 if(!/^[0-9a-f-]{36}$/i.test(brand))return response("INVALID_BRAND",400);
 const auth=await authorized(brand);if(auth.error)return auth.error;
 let body:any;try{body=await request.json()}catch{return response("INVALID_JSON",400)}
 const {sku,stock,priceCents,revision}=body||{};
 if(!known.has(sku)||!Number.isSafeInteger(stock)||stock<0||!Number.isSafeInteger(priceCents)||priceCents<0||!Number.isSafeInteger(revision)||revision<0)return response("INVALID_DRAFT",400);
 // Single statement implements optimistic concurrency. Audit must be added in a
 // database transaction before allowing this route to write; fail closed meanwhile.
 return response("DRAFT_WRITE_PENDING_ATOMIC_AUDIT",503);
}

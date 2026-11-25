import {timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store, private"};
export async function GET(req:Request){
 const secret=process.env.BOUTIQUE_ORDER_SYNC_SECRET;
 const supplied=req.headers.get("authorization")||"";
 const expected="Bearer "+secret;
 if(!secret||Buffer.byteLength(supplied)!==Buffer.byteLength(expected)||
    !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))
  return NextResponse.json({error:"Unauthorized."},{status:401,headers});
 try{
  const sql=db();
  const [stateRows,items]=await Promise.all([
   sql`SELECT mode,cutover_ready,reconciliation_status,updated_at
      FROM wgos.inventory_control_state WHERE brand_id='dionnesBoutique' LIMIT 1`,
   sql`SELECT p.source_record_id AS id,p.active,p.sellable,p.condition_status,
      p.price_cents,COALESCE(v.available,0) AS available,
      COALESCE((p.metadata->>'needsConditionReview')::boolean,true) AS condition_review_pending,
      COALESCE((p.metadata->>'needsStockConfirmation')::boolean,true) AS count_pending
      FROM wgos.inventory_products p
      JOIN wgos.inventory_position v ON v.product_id=p.id
      WHERE p.brand_id='dionnesBoutique' AND p.source_system='DIONNES_CATALOG'
      ORDER BY p.source_record_id::integer`
  ]);
  if(!stateRows.length||items.length!==69)throw new Error("Catalog reconciliation incomplete.");
  const ids=new Set<number>();
  const products=items.map((item:any)=>{
   const id=Number(item.id),priceCents=Number(item.price_cents),available=Number(item.available);
   if(!Number.isSafeInteger(id)||id<1||id>69||ids.has(id)||
      !Number.isSafeInteger(priceCents)||priceCents<0||
      !Number.isSafeInteger(available)||available<0)throw new Error("Invalid catalog record.");
   ids.add(id);
   return {id,priceCents,available,active:item.active===true,
    sellable:item.sellable===true,condition:String(item.condition_status),
    countConfirmed:item.count_pending===false,conditionReviewed:item.condition_review_pending===false};
  });
  const state=stateRows[0];
  return NextResponse.json({
   source:"WGOS",brandId:"dionnesBoutique",
   mode:String(state.mode),cutoverReady:state.cutover_ready===true,
   reconciliationStatus:String(state.reconciliation_status),
   products
  },{headers});
 }catch{
  return NextResponse.json({error:"Inventory unavailable."},{status:503,headers});
 }
}

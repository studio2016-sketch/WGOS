import "server-only";
import {db} from "./db";

export async function inventorySnapshot(brandId:string){
 const sql=db();
 const [stateRows,products,locations,batches]=await Promise.all([
  sql`SELECT * FROM wgos.inventory_control_state WHERE brand_id=${brandId} LIMIT 1`,
  sql`SELECT * FROM wgos.inventory_position WHERE brand_id=${brandId} ORDER BY active DESC,category,manufacturer,product_name,variant_name`,
  sql`SELECT * FROM wgos.inventory_locations WHERE brand_id=${brandId} AND active=true ORDER BY name`,
  sql`SELECT * FROM wgos.inventory_import_batches WHERE brand_id=${brandId} ORDER BY created_at DESC LIMIT 10`
 ]);
 return {state:stateRows[0]||null,products,locations,batches};
}

export async function createInventoryProduct(input:{brandId:string;externalKey?:string;sku?:string;category?:string;manufacturer?:string;productName:string;variantName?:string;conditionStatus?:string;priceCents?:number;costCents?:number|null;imageUrl?:string;sellable?:boolean;actor:string}){
 const name=input.productName.trim();if(!name)throw new Error("Product name is required.");
 const sql=db();const rows=await sql`
  INSERT INTO wgos.inventory_products(brand_id,external_key,sku,category,manufacturer,product_name,variant_name,condition_status,price_cents,cost_cents,image_url,sellable,source_system)
  VALUES(${input.brandId},${input.externalKey?.trim()||null},${input.sku?.trim()||null},${input.category?.trim()||null},${input.manufacturer?.trim()||null},${name},${input.variantName?.trim()||null},${input.conditionStatus||"NEW"},${Math.max(0,Number(input.priceCents||0))},${input.costCents==null?null:Math.max(0,Number(input.costCents))},${input.imageUrl?.trim()||null},${Boolean(input.sellable)},'WGOS')
  RETURNING *`;
 const product:any=rows[0];
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'INVENTORY_PRODUCT_CREATED','inventory_product',${String(product.id)},jsonb_build_object('brandId',${input.brandId}::text,'name',${name}::text))`;
 return product;
}

export async function updateInventoryProduct(input:{brandId:string;productId:string;priceCents?:number;costCents?:number|null;sellable?:boolean;active?:boolean;imageUrl?:string;actor:string}){
 const sql=db();const rows=await sql`
  UPDATE wgos.inventory_products SET
   price_cents=COALESCE(${input.priceCents==null?null:Math.max(0,Number(input.priceCents))},price_cents),
   cost_cents=CASE WHEN ${input.costCents===undefined} THEN cost_cents ELSE ${input.costCents==null?null:Math.max(0,Number(input.costCents))} END,
   sellable=COALESCE(${input.sellable===undefined?null:Boolean(input.sellable)},sellable),
   active=COALESCE(${input.active===undefined?null:Boolean(input.active)},active),
   image_url=CASE WHEN ${input.imageUrl===undefined} THEN image_url ELSE ${input.imageUrl?.trim()||null} END,
   updated_at=now()
  WHERE id=${input.productId}::uuid AND brand_id=${input.brandId}
  RETURNING *`;
 const product:any=rows[0];if(!product)throw new Error("Inventory product not found.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'INVENTORY_PRODUCT_UPDATED','inventory_product',${input.productId},jsonb_build_object('brandId',${input.brandId}::text))`;
 return product;
}

export async function adjustInventory(input:{brandId:string;productId:string;locationId:string;quantityDelta:number;movementType:string;notes?:string;actor:string;idempotencyKey?:string}){
 const allowed=new Set(["OPENING","RECEIPT","SALE","RETURN","ADJUSTMENT","RESERVATION","RELEASE","DAMAGE","WRITE_OFF"]);
 if(!allowed.has(input.movementType))throw new Error("Unsupported movement type.");
 const delta=Number(input.quantityDelta);if(!Number.isFinite(delta)||delta===0)throw new Error("Quantity change must be non-zero.");
 const sql=db();
 const productRows:any[]=await sql`SELECT id FROM wgos.inventory_products WHERE id=${input.productId}::uuid AND brand_id=${input.brandId} LIMIT 1`;if(!productRows[0])throw new Error("Inventory product not found.");
 const locationRows:any[]=await sql`SELECT id FROM wgos.inventory_locations WHERE id=${input.locationId}::uuid AND brand_id=${input.brandId} AND active=true LIMIT 1`;if(!locationRows[0])throw new Error("Inventory location not found.");
 const currentRows:any[]=await sql`SELECT on_hand,reserved FROM wgos.inventory_stock_levels WHERE product_id=${input.productId}::uuid AND location_id=${input.locationId}::uuid LIMIT 1`;
 const current=Number(currentRows[0]?.on_hand||0),reserved=Number(currentRows[0]?.reserved||0);
 let nextOnHand=current,nextReserved=reserved;
 if(input.movementType==="RESERVATION")nextReserved=reserved+Math.abs(delta);
 else if(input.movementType==="RELEASE")nextReserved=Math.max(0,reserved-Math.abs(delta));
 else nextOnHand=current+delta;
 if(nextOnHand<0)throw new Error("Adjustment would make on-hand inventory negative.");
 if(nextReserved>nextOnHand)throw new Error("Reserved inventory cannot exceed on-hand inventory.");
 await sql`
  INSERT INTO wgos.inventory_stock_levels(product_id,location_id,on_hand,reserved,updated_at)
  VALUES(${input.productId}::uuid,${input.locationId}::uuid,${nextOnHand},${nextReserved},now())
  ON CONFLICT(product_id,location_id) DO UPDATE SET on_hand=EXCLUDED.on_hand,reserved=EXCLUDED.reserved,updated_at=now()`;
 await sql`
  INSERT INTO wgos.inventory_movements(brand_id,product_id,location_id,movement_type,quantity_delta,source_system,source_type,idempotency_key,notes,actor_subject)
  VALUES(${input.brandId},${input.productId}::uuid,${input.locationId}::uuid,${input.movementType},${delta},'WGOS','MANUAL',${input.idempotencyKey||null},${input.notes?.trim()||null},${input.actor})`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'INVENTORY_QUANTITY_ADJUSTED','inventory_product',${input.productId},jsonb_build_object('brandId',${input.brandId}::text,'movementType',${input.movementType}::text,'delta',${delta}::numeric))`;
 return {onHand:nextOnHand,reserved:nextReserved,available:nextOnHand-nextReserved};
}

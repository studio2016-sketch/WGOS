import "server-only";
import {db} from "./db";
import catalog from "./data/dionnes-catalog.json";

export async function importBoutiqueCatalog(actor:string){
 const ids=new Set<number>();
 for(const item of catalog.items){
  if(!Number.isSafeInteger(item.id)||ids.has(item.id)||!item.name.trim()||!Number.isSafeInteger(item.stock)||item.stock<0||!Number.isFinite(item.price)||item.price<0)
   throw new Error("Catalog validation failed.");
  ids.add(item.id);
 }
 const sql=db();
 const result=await sql`
 WITH source AS (
  SELECT * FROM jsonb_to_recordset(${JSON.stringify(catalog.items)}::jsonb)
  AS x(id integer,category text,brand text,name text,variant text,stock numeric,price numeric,condition text,"imageUrl" text,"imageSource" text)
 ), location AS (
  SELECT id FROM wgos.inventory_locations WHERE brand_id='dionnesBoutique' AND code='MAIN' AND active=true
 ), inserted AS (
  INSERT INTO wgos.inventory_products(brand_id,external_key,category,manufacturer,product_name,variant_name,condition_status,price_cents,image_url,sellable,source_system,source_record_id,metadata)
  SELECT 'dionnesBoutique','DIONNES_CATALOG:'||s.id,s.category,s.brand,s.name,NULLIF(s.variant,''),
   CASE WHEN s.category='Open Box' THEN 'OPEN_BOX' ELSE 'UNKNOWN' END,round(s.price*100)::bigint,s."imageUrl",false,
   'DIONNES_CATALOG',s.id::text,jsonb_build_object('sourceRevision',${catalog.revision}::text,'sourceCondition',s.condition,'sourceStock',s.stock,'imageSource',s."imageSource",'needsStockConfirmation',true,'needsConditionReview',true)
  FROM source s
  ON CONFLICT (brand_id,external_key) WHERE external_key IS NOT NULL DO NOTHING
  RETURNING *
 ), stock AS (
  INSERT INTO wgos.inventory_stock_levels(product_id,location_id,on_hand,reserved)
  SELECT p.id,(SELECT id FROM location),s.stock,0 FROM inserted p JOIN source s ON p.source_record_id=s.id::text
  RETURNING product_id
 ), movements AS (
  INSERT INTO wgos.inventory_movements(brand_id,product_id,location_id,movement_type,quantity_delta,source_system,source_type,source_id,notes,actor_subject)
  SELECT 'dionnesBoutique',p.id,(SELECT id FROM location),'OPENING',s.stock,'DIONNES_CATALOG','CATALOG_IMPORT',${catalog.revision},'Recorded catalog quantity; physical count pending.',${actor}
  FROM inserted p JOIN source s ON p.source_record_id=s.id::text WHERE s.stock>0
 ), audit AS (
  INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
  SELECT ${actor},'INVENTORY_PRODUCT_IMPORTED','inventory_product',id::text,jsonb_build_object('brandId','dionnesBoutique','sourceRevision',${catalog.revision}::text) FROM inserted
 ), batch AS (
  INSERT INTO wgos.inventory_import_batches(brand_id,source_system,source_ref,status,source_count,matched_count,discrepancy_count,created_by,payload,validation,applied_at)
  SELECT 'dionnesBoutique','DIONNES_CATALOG',${catalog.revision},'APPLIED',${catalog.items.length},count(*)::integer,0,${actor},
   jsonb_build_object('source',${catalog.source}::text,'basis',${catalog.inventoryBasis}::text),
   jsonb_build_object('imported',count(*),'skipped',${catalog.items.length}::integer-count(*),'stockConfirmation','PENDING','conditionReview','PENDING'),now() FROM inserted
 )
 SELECT count(*)::integer AS imported,${catalog.items.length}::integer-count(*)::integer AS skipped FROM inserted`;
 return {...result[0],sourceRevision:catalog.revision};
}

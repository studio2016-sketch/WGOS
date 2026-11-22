import 'server-only';
import {db} from './db';
import {
 STUDIO_PLAN_BRAND,STUDIO_PLAN_KEY_PREFIX,STUDIO_PLAN_SKU_PREFIX,STUDIO_PLAN_SOURCE,
 type PlannedEquipmentItem,type PlannedEquipmentRecord,
} from './studio-planned-equipment-input';

export async function listStudioPlannedEquipment(){
 const sql=db();
 const rows=await sql`
  SELECT id::text,source_record_id AS "itemCode",product_name AS name,category,
   cost_cents AS "replacementValueCents",metadata->'rentalRatePerDayCents' AS "rentalRatePerDayCents",
   metadata->>'sourceReference' AS "sourceReference"
  FROM wgos.inventory_products
  WHERE brand_id=${STUDIO_PLAN_BRAND} AND source_system=${STUDIO_PLAN_SOURCE}
  ORDER BY source_record_id LIMIT 301`;
 const toCents=(value:unknown)=>value===null||value===undefined?null:Number(value);
 const items=rows.slice(0,300).map(row=>({
  id:String(row.id),itemCode:String(row.itemCode),name:String(row.name),category:String(row.category),
  replacementValueCents:toCents(row.replacementValueCents),rentalRatePerDayCents:toCents(row.rentalRatePerDayCents),
  sourceReference:typeof row.sourceReference==='string'?row.sourceReference:null,
 } satisfies PlannedEquipmentRecord));
 return {items,truncated:rows.length>300};
}

export async function importStudioPlannedEquipment(items:PlannedEquipmentItem[],actor:string){
 const sql=db();
 // All in one PostgreSQL statement: validate any existing key+SKU first;
 // insert only missing rows, with no ON CONFLICT updates. A race rolls the
 // whole statement back; a fresh snapshot distinguishes exact retry/collision.
 const write=()=>sql`
 WITH incoming AS (
  SELECT s.*,${STUDIO_PLAN_KEY_PREFIX}::text||s."itemCode" AS key,
   ${STUDIO_PLAN_SKU_PREFIX}::text||s."itemCode" AS sku,
   jsonb_build_object('planningOnly',true,'rentalRatePerDayCents',s."rentalRatePerDayCents",'sourceReference',s."sourceReference") AS meta
  FROM jsonb_to_recordset(${JSON.stringify(items)}::jsonb) s("itemCode" text,name text,category text,"replacementValueCents" bigint,"rentalRatePerDayCents" bigint,"sourceReference" text)
 ), existing AS (
  SELECT i."itemCode" AS code,p.id,
    p.external_key IS NOT DISTINCT FROM i.key AND p.sku IS NOT DISTINCT FROM i.sku AND
    p.source_system IS NOT DISTINCT FROM ${STUDIO_PLAN_SOURCE} AND p.source_record_id IS NOT DISTINCT FROM i."itemCode" AND
    p.product_name IS NOT DISTINCT FROM i.name AND p.category IS NOT DISTINCT FROM i.category AND
    p.cost_cents IS NOT DISTINCT FROM i."replacementValueCents" AND p.metadata IS NOT DISTINCT FROM i.meta AND
    p.sellable=false AND p.active=false AND p.price_cents=0 AND p.condition_status='HOLD' AS identical
  FROM incoming i JOIN wgos.inventory_products p
   ON p.brand_id=${STUDIO_PLAN_BRAND} AND (p.external_key=i.key OR p.sku=i.sku)
 ), conflicts AS (
  SELECT DISTINCT code FROM existing WHERE NOT identical
 ), inserted AS (
  INSERT INTO wgos.inventory_products
   (brand_id,external_key,sku,product_name,category,cost_cents,price_cents,sellable,active,condition_status,source_system,source_record_id,metadata)
  SELECT ${STUDIO_PLAN_BRAND},i.key,i.sku,i.name,i.category,i."replacementValueCents",0,false,false,'HOLD',${STUDIO_PLAN_SOURCE},i."itemCode",i.meta
  FROM incoming i
  WHERE NOT EXISTS(SELECT 1 FROM conflicts) AND NOT EXISTS(SELECT 1 FROM existing e WHERE e.code=i."itemCode")
  ORDER BY i."itemCode"
  RETURNING id,source_record_id AS code
 ), audit AS (
  INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
  SELECT ${actor},'STUDIO2016_PLANNED_EQUIPMENT_IMPORTED','inventory_product',id::text,
   jsonb_build_object('brandId',${STUDIO_PLAN_BRAND}::text,'itemCode',code) FROM inserted
 )
 SELECT
  COALESCE((SELECT jsonb_agg(code ORDER BY code) FROM conflicts),'[]'::jsonb) AS conflicts,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('itemCode',code,'id',id,'disposition',disposition) ORDER BY code)
   FROM (SELECT code,id,'inserted' AS disposition FROM inserted UNION ALL
         SELECT code,id,'existing' FROM existing WHERE identical) matched),'[]'::jsonb) AS items`;
 let result;
 try{result=await write();}
 catch(error){
  if((error as {code?:string})?.code!=='23505')throw error;
  result=await write();
 }
 const {conflicts,items:matched}=result[0] as {
  conflicts:string[];items:{itemCode:string;id:string;disposition:'inserted'|'existing'}[];
 };
 return conflicts.length?{conflicts,items:[]}:{conflicts:[],items:matched};
}

export async function isStudioPlanningRecord(brandId:string,productId:string){
 if(brandId!==STUDIO_PLAN_BRAND)return false;
 const rows=await db()`SELECT 1 FROM wgos.inventory_products WHERE brand_id=${brandId} AND id=${productId}::uuid AND source_system=${STUDIO_PLAN_SOURCE} LIMIT 1`;
 return Boolean(rows[0]);
}

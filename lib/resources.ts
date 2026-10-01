import "server-only";
import {db} from "./db";

const statuses=new Set(["AVAILABLE","RESERVED","OUT","MAINTENANCE","RETIRED"]);

export async function listEquipmentAssets(brandId?:string){
 const sql=db();
 if(brandId)return sql`SELECT e.*,b.name brand_name FROM wgos.equipment_assets e LEFT JOIN wgos.brands b ON b.id=e.brand_id WHERE e.brand_id=${brandId} ORDER BY e.status,e.category,e.manufacturer,e.model`;
 return sql`SELECT e.*,b.name brand_name FROM wgos.equipment_assets e LEFT JOIN wgos.brands b ON b.id=e.brand_id ORDER BY e.status,e.category,e.manufacturer,e.model`;
}

export async function createEquipmentAsset(input:{brandId:string;category:string;manufacturer?:string;model?:string;assetTag?:string;serialNumber?:string;locationText?:string;replacementValueCents?:number;actor:string}){
 const category=input.category.trim();if(!category)throw new Error("Equipment category is required.");
 const sql=db();const rows=await sql`INSERT INTO wgos.equipment_assets(brand_id,asset_tag,category,manufacturer,model,serial_number,location_text,replacement_value_cents,status) VALUES(${input.brandId},${input.assetTag?.trim()||null},${category},${input.manufacturer?.trim()||null},${input.model?.trim()||null},${input.serialNumber?.trim()||null},${input.locationText?.trim()||null},${Math.max(0,Number(input.replacementValueCents||0))},'AVAILABLE') RETURNING *`;
 const asset:any=rows[0];await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'EQUIPMENT_ASSET_CREATED','equipment_asset',${String(asset.id)},jsonb_build_object('brandId',${input.brandId},'category',${category}))`;return asset;
}

export async function updateEquipmentStatus(input:{assetId:string;status:string;actor:string}){
 if(!statuses.has(input.status))throw new Error("Unsupported equipment status.");
 const sql=db();const rows=await sql`UPDATE wgos.equipment_assets SET status=${input.status} WHERE id=${input.assetId}::uuid RETURNING *`;const asset:any=rows[0];if(!asset)throw new Error("Equipment asset not found.");await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'EQUIPMENT_STATUS_UPDATED','equipment_asset',${input.assetId},jsonb_build_object('status',${input.status}))`;return asset;
}

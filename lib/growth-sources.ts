import "server-only";
import {db} from "./db";
export async function listGrowthSources(authUserId?:string|null,isGlobal=false,brandId?:string|null){
 const sql=db();
 return authUserId&&!isGlobal
 ? sql`SELECT s.*,b.name brand_name FROM wgos.growth_data_sources s JOIN wgos.brands b ON b.id=s.brand_id JOIN wgos.brand_memberships bm ON bm.brand_id=s.brand_id AND bm.auth_user_id=${authUserId} AND bm.active=true WHERE (${brandId||null}::text IS NULL OR s.brand_id=${brandId||null}) ORDER BY b.name,s.provider`
 : sql`SELECT s.*,b.name brand_name FROM wgos.growth_data_sources s JOIN wgos.brands b ON b.id=s.brand_id WHERE (${brandId||null}::text IS NULL OR s.brand_id=${brandId||null}) ORDER BY b.name,s.provider`;
}

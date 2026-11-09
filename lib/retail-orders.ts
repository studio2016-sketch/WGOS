import "server-only";
import {db} from "./db";

export const orderFilters=["ALL","REVIEW","READY","SHIPPED"] as const;
type OrderFilter=typeof orderFilters[number];

export function orderQueueOptions(query:{orders?:unknown;orderPage?:unknown}){
 const filter=orderFilters.includes(query.orders as OrderFilter)?query.orders as OrderFilter:"ALL";
 const raw=typeof query.orderPage==="string"?query.orderPage:"";
 const page=/^[1-9][0-9]{0,5}$/.test(raw)?Number(raw):1;
 return {filter,page};
}

// Call only after the page has verified manager access to this brand.
export async function paidOrderQueue(brandId:string,query:{orders?:unknown;orderPage?:unknown}){
 const {filter,page}=orderQueueOptions(query);
 const rows=await db()`SELECT id,fulfillment_status,amount_total,currency,customer_email,review_reason,created_at,items,shipping_details
  FROM wgos.retail_orders WHERE brand_id=${brandId} AND (${filter}::text='ALL' OR fulfillment_status=${filter})
  ORDER BY (fulfillment_status='REVIEW') DESC,created_at DESC,id DESC LIMIT 51 OFFSET ${(page-1)*50}`;
 return {orders:rows.slice(0,50),hasNext:rows.length>50,filter,page};
}

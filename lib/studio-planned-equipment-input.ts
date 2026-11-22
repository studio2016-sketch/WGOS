export const STUDIO_PLAN_BRAND='studio2016';
export const STUDIO_PLAN_SOURCE='WGOS_STUDIO2016_PLANNING_V1';
export const STUDIO_PLAN_KEY_PREFIX='STUDIO2016_PLAN:';
export const STUDIO_PLAN_SKU_PREFIX='STUDIO-PLAN:';
export const STUDIO_PLAN_MAX_ITEMS=50;
export const STUDIO_PLAN_MAX_BYTES=96*1024;
export const STUDIO_PLAN_PATH='/admin/pursuits/planned-equipment';
export const STUDIO_PLAN_CANONICAL_ORIGIN='https://wgos.app';

export type PlannedEquipmentItem={
 itemCode:string;
 name:string;
 category:string;
 replacementValueCents:number|null;
 rentalRatePerDayCents:number|null;
 sourceReference:string|null;
};
export type PlannedEquipmentRecord=PlannedEquipmentItem&{id:string};

export class PlanImportError extends Error {
 readonly status:number;
 constructor(message:string,status=400){super(message);this.status=status;}
}
function record(input:unknown):Record<string,unknown>|null{
 return typeof input==='object'&&input!==null&&!Array.isArray(input)?input as Record<string,unknown>:null;
}
function plain(value:unknown,limit:number){
 return typeof value==='string'&&value.trim().length>0&&value.trim().length<=limit&&!/[\p{Cc}\p{Cf}]/u.test(value)?value.trim():null;
}
function validMoney(value:unknown):value is number|null{
 return value===null||(typeof value==='number'&&Number.isSafeInteger(value)&&value>0&&value<=1_000_000_000);
}
export function parsePlanImport(body:unknown):PlannedEquipmentItem[]{
 const data=record(body);
 if(!data||Object.keys(data).length!==1||!Array.isArray(data.items)||data.items.length===0||data.items.length>STUDIO_PLAN_MAX_ITEMS)
  throw new PlanImportError(`Supply an items array with 1–${STUDIO_PLAN_MAX_ITEMS} planned items.`);
 const seen=new Set<string>();
 return data.items.map((value,index)=>{
  const row=record(value);
  const label=`Item ${index+1}`;
  const keys=['itemCode','name','category','replacementValueCents','rentalRatePerDayCents','sourceReference'];
  if(!row||Object.keys(row).some(key=>!keys.includes(key)))throw new PlanImportError(`${label}: use only the listed planning fields.`);
  const rawCode=typeof row.itemCode==='string'?row.itemCode.trim():'';
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$/.test(rawCode))throw new PlanImportError(`${label}: itemCode must contain 1–48 letters, digits, hyphens or underscores, starting with a letter or digit.`);
  const itemCode=rawCode.toUpperCase();
  if(seen.has(itemCode))throw new PlanImportError(`${label}: itemCode is duplicated within this batch.`);
  seen.add(itemCode);
  const name=plain(row.name,180),category=plain(row.category,100);
  if(!name||!category)throw new PlanImportError(`${label}: provide a single-line name and category.`);
  const replacementValueCents=row.replacementValueCents,rentalRatePerDayCents=row.rentalRatePerDayCents;
  if(!validMoney(replacementValueCents)||!validMoney(rentalRatePerDayCents))
   throw new PlanImportError(`${label}: explicitly enter both values as positive whole USD cents (up to $10,000,000) or null if unknown.`);
  const sourceReference=row.sourceReference===undefined||row.sourceReference===null?null:plain(row.sourceReference,180);
  if(row.sourceReference!==undefined&&row.sourceReference!==null&&!sourceReference)
   throw new PlanImportError(`${label}: provide a short single-line source reference or null.`);
  return {itemCode,name,category,replacementValueCents,rentalRatePerDayCents,sourceReference};
 });
}

export function isSameOriginPlanRequest(req:Request,mode=process.env.NODE_ENV){
 const origin=req.headers.get('origin');
 const fetchSite=req.headers.get('sec-fetch-site');
 if(!origin||(fetchSite!==null&&fetchSite.trim().toLowerCase()!=='same-origin'))return false;
 // The canonical browser origin is explicit; Next can reconstruct req.url
 // from an internal listener behind a reverse proxy. Neither Host nor any
 // user-supplied Forwarded / X-Forwarded header enlarges the allowed set.
 if(origin===STUDIO_PLAN_CANONICAL_ORIGIN)return true;
 if(mode!=='development'&&mode!=='test')return false;
 const incoming=new URL(req.url);
 const isLoopback=(host:string)=>['localhost','127.0.0.1','[::1]'].includes(host);
 if(!isLoopback(incoming.hostname)||(incoming.protocol!=='http:'&&incoming.protocol!=='https:'))return false;
 const host=req.headers.get('host');
 if(origin===incoming.origin)return host===null||host===incoming.host;
 // Next's dev server may rewrite 127.0.0.1 to localhost in req.url. On
 // loopback only, permit this alias when the request's raw Host matches the
 // exact validated Origin host, and the listener's protocol and port match.
 try{
  const loopbackOrigin=new URL(origin);
  return origin===loopbackOrigin.origin&&isLoopback(loopbackOrigin.hostname)&&
   loopbackOrigin.protocol===incoming.protocol&&loopbackOrigin.port===incoming.port&&
   host===loopbackOrigin.host;
 }catch{return false;}
}

export async function readPlanJson(req:Request):Promise<unknown>{
 if(req.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')
  throw new PlanImportError('Use application/json.',415);
 if(Number(req.headers.get('content-length')||0)>STUDIO_PLAN_MAX_BYTES)throw new PlanImportError('The batch is too large.',413);
 const reader=req.body?.getReader();
 if(!reader)throw new PlanImportError('Supply a JSON body.');
 const decoder=new TextDecoder('utf-8',{fatal:true});
 try{
  let size=0,body='';
  while(true){
   const {value,done}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>STUDIO_PLAN_MAX_BYTES){void reader.cancel().catch(()=>{});throw new PlanImportError('The batch is too large.',413);}
   body+=decoder.decode(value,{stream:true});
  }
  return JSON.parse(body+decoder.decode());
 }catch(error){
  if(error instanceof PlanImportError)throw error;
  throw new PlanImportError('The JSON body is invalid.');
 }finally{
  reader.releaseLock();
 }
}

export function isReservedPlanKey(value:unknown){
 if(typeof value!=='string')return false;
 const normalized=value.trim().toUpperCase();
 return normalized.startsWith(STUDIO_PLAN_KEY_PREFIX)||normalized.startsWith(STUDIO_PLAN_SKU_PREFIX);
}

export function plannedRentalSubtotal(
 lines:readonly {quantity:string;rentalRatePerDayCents:number|null}[],days:string,
):{kind:'empty'|'incomplete'}|{kind:'subtotal';cents:number}{
 if(!lines.length)return {kind:'empty'};
 const count=(input:string,max:number)=>{
  if(!/^[1-9][0-9]{0,2}$/.test(input.trim()))return null;
  const parsed=Number(input);
  return parsed<=max?parsed:null;
 };
 const dayCount=count(days,365);
 if(dayCount===null)return {kind:'incomplete'};
 let total=0;
 for(const line of lines){
  const quantity=count(line.quantity,999);
  if(quantity===null||line.rentalRatePerDayCents===null||!validMoney(line.rentalRatePerDayCents))return {kind:'incomplete'};
  total+=quantity*line.rentalRatePerDayCents*dayCount;
  if(!Number.isSafeInteger(total))return {kind:'incomplete'};
 }
 return {kind:'subtotal',cents:total};
}

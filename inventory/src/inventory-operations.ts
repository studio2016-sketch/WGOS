/**
 * Server-only inventory domain logic. DB transactions and authenticated entity scope
 * must be supplied by the host application before this module is exposed via API.
 */
export type Stock = {onHand:number;reserved:number;reorderPoint:number;reorderTarget:number};
export type OrderAction = 'reserve'|'fulfill'|'cancel'|'return';
export function available(s:Stock){return s.onHand-s.reserved}
export function reorderQuantity(s:Stock){
 if(s.reorderTarget<s.reorderPoint) throw Error('Invalid reorder policy');
 return available(s)<=s.reorderPoint ? Math.max(0,s.reorderTarget-available(s)):0;
}
export function transition(s:Stock,action:OrderAction,qty:number):Stock {
 if(!Number.isSafeInteger(qty)||qty<=0) throw Error('Invalid quantity');
 const next={...s};
 switch(action){
 case 'reserve': if(available(s)<qty)throw Error('Insufficient stock');next.reserved+=qty;break;
 case 'fulfill': if(s.reserved<qty)throw Error('Reservation missing');next.reserved-=qty;next.onHand-=qty;break;
 case 'cancel': if(s.reserved<qty)throw Error('Reservation missing');next.reserved-=qty;break;
 case 'return': next.onHand+=qty;break;
 }
 if(next.onHand<0||next.reserved<0||next.reserved>next.onHand)throw Error('Stock invariant violated');
 return next;
}
export function countVariance(expected:number,observed:number){
 if(!Number.isSafeInteger(observed)||observed<0)throw Error('Invalid count');
 return observed-expected;
}
export type SnapshotRow={sku:string;barcode?:string|null;quantity:number;priceCents:number;imageUrl?:string|null;active:boolean};
export function compareSnapshots(oldRows:SnapshotRow[],newRows:SnapshotRow[]){
 const map=new Map(newRows.map(x=>[x.sku,x]));
 return oldRows.flatMap(old=>{
 const current=map.get(old.sku);
 if(!current)return [{sku:old.sku,field:'missing',before:old,after:null}];
 const fields=['barcode','quantity','priceCents','imageUrl','active'] as const;
 return fields.filter(k=>(old[k]??null)!==(current[k]??null)).map(field=>({sku:old.sku,field,before:old[field]??null,after:current[field]??null}));
 }).concat(newRows.filter(x=>!oldRows.some(y=>y.sku===x.sku)).map(x=>({sku:x.sku,field:'new',before:null,after:x})));
}

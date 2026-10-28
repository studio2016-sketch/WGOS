import 'server-only';
import {db} from './db';
import {searchAttribution} from './search-attribution';

export function groupSearchRevenue(leads: any[], receipts: any[]) {
  const groups = new Map<string, {brandId:string;channel:string;source:string;landingPath:string;inquiries:number;won:number;receipts:number;amount:number;currency:string}>();
  const group = (row:any, currency='') => {
    const a=searchAttribution(row.discovery || {});
    const key=JSON.stringify([row.brand_id,a.channel,a.source,a.landingPath,currency]);
    if(!groups.has(key))groups.set(key,{brandId:String(row.brand_id),channel:a.channel,source:a.source,landingPath:a.landingPath,inquiries:0,won:0,receipts:0,amount:0,currency});
    return groups.get(key)!;
  };
  for(const row of leads){const g=group(row);g.inquiries++;if(row.stage==='WON')g.won++;}
  // Payment join is one receipt -> one proposal -> one opportunity. Never join all
  // proposals to all payments or treat the estimated opportunity value as revenue.
  for(const row of receipts){const g=group(row,String(row.currency).trim().toUpperCase());g.receipts++;g.amount+=Number(row.amount);}
  return [...groups.values()].sort((a,b)=>b.inquiries-a.inquiries || a.source.localeCompare(b.source));
}
export async function getSearchRevenue(brandIds:string[]) {
  if(!brandIds.length)return {groups:[],start:'',end:''};
  const sql=db();
  const [window,leads,receipts]=await Promise.all([
    sql`SELECT (now()-interval '28 days')::text start,now()::text end`,
    sql`SELECT o.brand_id,o.stage,o.discovery FROM wgos.opportunities o
      WHERE o.brand_id=ANY(${brandIds}::text[]) AND o.source='PUBLIC_WEB_INQUIRY' AND o.created_at>=now()-interval '28 days'`,
    sql`SELECT p.brand_id,o.discovery,py.amount,py.currency FROM wgos.payments py
      JOIN wgos.proposals p ON p.id=py.proposal_id
      JOIN wgos.opportunities o ON o.id=p.opportunity_id AND o.brand_id=p.brand_id
      WHERE p.brand_id=ANY(${brandIds}::text[]) AND py.status='PAID' AND py.provider='STRIPE'
      AND py.provider_external_id IS NOT NULL AND py.paid_at>=now()-interval '28 days' AND o.source='PUBLIC_WEB_INQUIRY'`
  ]);
  return {groups:groupSearchRevenue(leads,receipts),start:String(window[0].start),end:String(window[0].end)};
}

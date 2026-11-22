// USD only. Keep money in integral cents and margin in basis points.
export const quoteCostCategories = [
 { id:'labor', label:'Paid crew & labor', hint:'Include payroll burden, prep, strike and paid replacement labor.' },
 { id:'transport', label:'Transport & logistics', hint:'Include delivery, return, fuel, parking and handling.' },
 { id:'equipment', label:'Equipment & materials', hint:'Include job-specific consumables or incremental owned-gear charges. Flag missing owned capacity; do not assume a rental.' },
 { id:'partners', label:'Outside services', hint:'Include approved outside service fees, venue-mandated charges, permits and other direct costs not captured above.' },
 { id:'overhead', label:'Job fees & other direct costs', hint:'Include payment fees and any incremental direct cost. Do not count fixed company overhead or reserve allocations twice.' },
 { id:'risk', label:'Contingency / unplanned costs', hint:'Estimate a buffer; in actuals enter only incurred costs not already recorded in other lines.' },
] as const;

export type QuoteCostId = typeof quoteCostCategories[number]['id'];
export type QuoteCosts = Record<QuoteCostId, string>;
export const emptyQuoteCosts = (): QuoteCosts => ({labor:'',transport:'',equipment:'',partners:'',overhead:'',risk:''});
export const readinessChecks = [
 {id:'scope', label:'Scope & schedule'},
 {id:'crew', label:'Paid crew capacity'},
 {id:'equipment', label:'Owned inventory & availability'},
 {id:'logistics', label:'Venue & logistics readiness'},
] as const;
type CheckId = typeof readinessChecks[number]['id'];
export type Readiness = Record<CheckId,{status:'unknown'|'confirmed'|'blocked'|'not-applicable';reference:string}>;
export const emptyReadiness = (): Readiness => ({
 scope:{status:'unknown',reference:''},crew:{status:'unknown',reference:''},
 equipment:{status:'unknown',reference:''},logistics:{status:'unknown',reference:''},
});

type Parsed = { state:'missing'|'invalid' } | { state:'valid'; value:number };

function fixedDecimal(raw:string,maxWholeDigits:number): Parsed {
 const text=raw.trim();
 if(!text)return {state:'missing'};
 if(!new RegExp(`^\\d{1,${maxWholeDigits}}(?:\\.\\d{1,2})?$`).test(text))return {state:'invalid'};
 const [whole,fraction=''] = text.split('.');
 return {state:'valid',value:Number(whole)*100+Number(fraction.padEnd(2,'0'))};
}

function readCosts(costs:QuoteCosts) {
 let sum=0;
 const missing:QuoteCostId[]=[];
 const invalid:QuoteCostId[]=[];
 for(const {id} of quoteCostCategories) {
  const parsed = fixedDecimal(costs[id],7);
  if(parsed.state==='valid')sum+=parsed.value;
  else if(parsed.state==='missing')missing.push(id);
  else invalid.push(id);
 }
 return {totalCents:missing.length||invalid.length?null:sum,missing,invalid};
}

function contribution(revenueCents:number,costCents:number) {
 const contributionCents=revenueCents-costCents;
 return {revenueCents,costCents,contributionCents,marginPct:revenueCents>0?contributionCents/revenueCents*100:null};
}
function plannedPrice(value:string):Parsed {
 const parsed=fixedDecimal(value,7);
 return parsed.state==='valid'&&parsed.value===0?{state:'invalid'}:parsed;
}

export function summarizeReadiness(readiness:Readiness) {
 if(readinessChecks.some(({id})=>readiness[id].status==='blocked'))return 'blocked' as const;
 const documented = readinessChecks.every(({id})=>{
  const check=readiness[id];
  return Boolean(check.reference.trim()) && (check.status==='confirmed'||(check.status==='not-applicable'&&id!=='scope'));
 });
 return documented?'documented' as const:'incomplete' as const;
}

export function calculateQuote(input:{
 estimateCosts:QuoteCosts; targetMargin:string; plannedPrice:string; actualCosts:QuoteCosts; actualRevenue:string;
 actualStatus:'open'|'reconciled';
}) {
 const estimateCosts=readCosts(input.estimateCosts);
 const actualCosts=readCosts(input.actualCosts);
 const parsedMargin=fixedDecimal(input.targetMargin,3);
 const targetMargin:Parsed=parsedMargin.state==='valid'&&parsedMargin.value>=10_000?{state:'invalid'}:parsedMargin;
 const estimatePrice=plannedPrice(input.plannedPrice);
 const actualRevenue=fixedDecimal(input.actualRevenue,7);
 const cost=estimateCosts.totalCents;
 // For a zero-cost job there is no cost-derived floor; a price chosen by the
 // user can still show the economics. Never suggest sending a $0 quote.
 const floorCents=cost!==null&&cost>0&&targetMargin.state==='valid'
   ?Math.ceil((cost*10_000)/(10_000-targetMargin.value)):null;
 const estimated=cost!==null&&estimatePrice.state==='valid'?contribution(estimatePrice.value,cost):null;
 const actual=actualCosts.totalCents!==null&&actualRevenue.state==='valid'&&input.actualStatus==='reconciled'
   ?contribution(actualRevenue.value,actualCosts.totalCents):null;
 return {
  estimateCosts,actualCosts,targetMargin,estimatePrice,actualRevenue,floorCents,estimated,actual,
  belowTarget:estimated&&targetMargin.state==='valid'&&floorCents!==null?estimated.revenueCents<floorCents:null,
  varianceCents:estimated&&actual?actual.contributionCents-estimated.contributionCents:null,
 };
}

// Run with Node >=22.18: node --test tests/quote-margin.cjs
const assert=require('node:assert/strict');
const test=require('node:test');
const {calculateQuote,emptyQuoteCosts,readinessChecks,emptyReadiness,summarizeReadiness}=require('../lib/quote-margin.ts');

const entered=(extra={})=>({labor:'0',transport:'0',equipment:'0',partners:'0',overhead:'0',risk:'0',...extra});
const input=(extra={})=>({estimateCosts:entered({labor:'70.01'}),targetMargin:'30',plannedPrice:'100.02',
 actualCosts:entered({labor:'72.10'}),actualRevenue:'100.02',actualStatus:'reconciled',...extra});

test('whole cents and round up to reach target after tax exclusion',()=>{
 const result=calculateQuote(input());
 assert.equal(result.estimateCosts.totalCents,7001);
 assert.equal(result.floorCents,10002);
 assert.equal(result.estimated.contributionCents,3001);
 assert.ok(result.estimated.marginPct>=30);
 assert.equal(result.belowTarget,false);
 assert.equal(result.actual.contributionCents,2792);
 assert.equal(result.varianceCents,-209);
});

test('blank is unknown, explicit zero is accepted, and invalid cost cannot masquerade as complete',()=>{
 const incomplete=calculateQuote(input({estimateCosts:entered({risk:'',partners:'1.005',labor:'-2'})}));
 assert.deepEqual(incomplete.estimateCosts.missing,['risk']);
 assert.deepEqual(incomplete.estimateCosts.invalid,['labor','partners']);
 assert.equal(incomplete.estimateCosts.totalCents,null);
 assert.equal(incomplete.floorCents,null);
 assert.equal(incomplete.estimated,null);
 assert.equal(incomplete.varianceCents,null);
 const free=calculateQuote(input({estimateCosts:entered(),plannedPrice:'1'}));
 assert.equal(free.estimateCosts.totalCents,0);
 assert.equal(free.floorCents,null);
 assert.equal(free.estimated.marginPct,100);
});

test('reject 100% or higher, malformed requests and zero planned price',()=>{
 for(const bad of ['100','100.1','-1','NaN','Infinity','25.555','1e2','1,00']){
  const result=calculateQuote(input({targetMargin:bad,plannedPrice:'0'}));
  assert.equal(result.targetMargin.state,'invalid',bad);
  assert.equal(result.floorCents,null);
  assert.equal(result.estimatePrice.state,'invalid');
  assert.equal(result.estimated,null);
 }
 const valid=calculateQuote(input({targetMargin:'99.99'}));
 assert.equal(valid.floorCents,70_010_000);
 assert.equal(valid.belowTarget,true);
});

test('negative contribution and zero collected cash stay truthful',()=>{
 const under=calculateQuote(input({plannedPrice:'40',actualRevenue:'0'}));
 assert.equal(under.estimated.contributionCents,-3001);
 assert.equal(under.belowTarget,true);
 assert.equal(under.actual.contributionCents,-7210);
 assert.equal(under.actual.marginPct,null);
 assert.equal(under.varianceCents,-4209);
});

test('actuals require complete costs, valid net collection, and explicit reconciliation',()=>{
 for(const extra of [{actualStatus:'open'},{actualRevenue:''},{actualCosts:emptyQuoteCosts()}]){
  const result=calculateQuote(input(extra));
  assert.equal(result.actual,null);
  assert.equal(result.varianceCents,null);
 }
});

test('readiness requires evidence for each confirmed or not-applicable check and never self-approves',()=>{
 const data=emptyReadiness();
 assert.equal(summarizeReadiness(data),'incomplete');
 for(const {id} of readinessChecks)data[id]={status:'confirmed',reference:id+' record'};
 assert.equal(summarizeReadiness(data),'documented');
 data.equipment={status:'not-applicable',reference:'Vendor provides spec and equipment.'};
 assert.equal(summarizeReadiness(data),'documented');
 data.equipment.reference=' ';
 assert.equal(summarizeReadiness(data),'incomplete');
 data.crew={status:'blocked',reference:''};
 assert.equal(summarizeReadiness(data),'blocked');
 data.crew={status:'confirmed',reference:'Roster'};
 data.equipment={status:'confirmed',reference:'Equipment list'};
 data.scope={status:'not-applicable',reference:'blank'};
 assert.equal(summarizeReadiness(data),'incomplete');
});

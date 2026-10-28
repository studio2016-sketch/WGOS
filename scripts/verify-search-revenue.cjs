const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(path,dependencies={}){const module={exports:{}};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{exports:module.exports,require:n=>{if(n in dependencies)return dependencies[n];throw Error('Unexpected import '+n);},URL,Date,Map,JSON,Number,String,Object,Array,RegExp});return module.exports;}
const attribution=load('lib/search-attribution.ts');
const {searchAttribution:a,safePath}=attribution;
assert.equal(a({referrer:'https://www.google.com/search?q=bass'}).source,'Google');
assert.equal(a({referrer:'https://google.com.evil.test/'}).channel,'Referral');
assert.equal(a({referrer:'https://www.google.co.uk/'}).source,'Google');
assert.equal(a({referrer:'https://bing.com/',utmMedium:'cpc'}).channel,'Paid');
assert.equal(a({referrer:'https://google.com/',utmMedium:'email'}).channel,'Email');
assert.equal(a({source:'PUBLIC_WEB_INQUIRY',utmSource:'Not provided'}).channel,'Direct / unknown');
assert.equal(a({attribution:{referrer:'https://duckduckgo.com/'}}).source,'DuckDuckGo');
assert.equal(safePath('/weddings?email=private@example.com#booking'),'/weddings');
assert.equal(safePath('javascript:alert(1)'),'');
assert.equal(safePath('/proposal/private-id?access=secret'),'');
const {groupSearchRevenue}=load('lib/search-revenue.ts',{'server-only':{},'./db':{db:()=>{throw Error('No database permitted in unit test');}},'./search-attribution':attribution});
const groups=groupSearchRevenue([{brand_id:'a',stage:'WON',discovery:{referrer:'https://bing.com/',landingPath:'/book'}}],[{brand_id:'a',amount:'100.25',currency:'USD',discovery:{referrer:'https://bing.com/',landingPath:'/book'}},{brand_id:'a',amount:'50',currency:'EUR',discovery:{referrer:'https://bing.com/',landingPath:'/book'}},{brand_id:'b',amount:'20',currency:'USD',discovery:{}}]);
assert.equal(groups.find(g=>g.brandId==='a'&&!g.currency).won,1);
assert.equal(groups.find(g=>g.brandId==='a'&&g.currency==='USD').amount,100.25);
assert.equal(groups.find(g=>g.brandId==='a'&&g.currency==='EUR').amount,50);
assert.equal(groups.find(g=>g.brandId==='b').amount,20);
// Exercise the actual public route: forged sale rejected before any database call.
const {POST}=load('app/api/public/growth-event/route.ts',{'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},'../../../../lib/growth-attribution':{recordGrowthEvent:()=>{throw Error('Unexpected write');}},'../../../../lib/db':{db:()=>{throw Error('Unexpected database read');}}});
(async()=>{for(const eventType of ['SALE','INQUIRY','LIST_SIGNUP'])assert.equal((await POST({json:async()=>({brandId:'a',eventType,valueCents:999999})})).status,400);
console.log('Search attribution, currency/brand separation, public-event rejection checks passed.');})();

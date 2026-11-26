const assert=require('node:assert/strict');
const test=require('node:test');
const {parsePlanImport,isSameOriginPlanRequest,readPlanJson,isReservedPlanKey,STUDIO_PLAN_MAX_BYTES}=require('../lib/studio-planned-equipment-input.ts');
const fixture=(fields={})=>({itemCode:'qa-feed-A7',name:'Synthetic stage widget',category:'QA',replacementValueCents:15890,rentalRatePerDayCents:null,...fields});
test('validate and canonicalize synthetic rows; unknown remains null',()=>{
 assert.deepEqual(parsePlanImport({items:[fixture()]}),[{...fixture({itemCode:'QA-FEED-A7'}),sourceReference:null}]);
 assert.throws(()=>parsePlanImport({items:[fixture(),fixture({itemCode:'Qa-FEEd-a7'})]}),/duplicated/);
});
test('reject scope, stock, retail, forged ownership fields, bad prices and invalid item keys',()=>{
 for(const item of [fixture({brandId:'other'}),fixture({quantity:1}),fixture({sellable:true}),fixture({openingQuantity:1}),fixture({price:1}),fixture({itemCode:'bad space'}),fixture({name:'x\nprivate'}),fixture({sourceReference:'x\u202ey'}),fixture({rentalRatePerDayCents:'10000'}),fixture({rentalRatePerDayCents:0}),fixture({replacementValueCents:undefined}),fixture({replacementValueCents:1.5})]){
  assert.throws(()=>parsePlanImport({items:[item]}));
 }
 assert.throws(()=>parsePlanImport({items:[fixture()],brandId:'else'}));
 assert.throws(()=>parsePlanImport({items:Array.from({length:51},(_,i)=>fixture({itemCode:String(i)}))}));
 assert.equal(isReservedPlanKey(' studio-plan:abc '),true);
 assert.equal(isReservedPlanKey('STUDIO2016_PLAN:ABCDE'),true);
 assert.equal(isReservedPlanKey('generic:abc'),false);
});
test('production permits only the fixed canonical browser origin, including proxy-rewritten URLs',()=>{
 const request=(headers={},url='http://127.0.0.1:4527/api/admin/pursuits/planned-equipment')=>new Request(url,{method:'POST',headers});
 assert.equal(isSameOriginPlanRequest(request({origin:'https://wgos.app','sec-fetch-site':'same-origin'}),'production'),true);
 assert.equal(isSameOriginPlanRequest(request({origin:'https://wgos.app'}),'production'),true);
 for(const fetchSite of ['cross-site','same-site','none']){
  assert.equal(isSameOriginPlanRequest(request({origin:'https://wgos.app','sec-fetch-site':fetchSite}),'production'),false);
 }
 for(const origin of ['https://wgos.app.example','https://admin.wgos.app','https://wgos.vercel.app','http://wgos.app','null','http://127.0.0.1:4527']){
  assert.equal(isSameOriginPlanRequest(request({origin,host:'wgos.app','x-forwarded-host':'wgos.app','x-forwarded-proto':'https'}),'production'),false);
 }
 assert.equal(isSameOriginPlanRequest(request({host:'wgos.app','x-forwarded-host':'wgos.app'}),'production'),false);
 assert.equal(isSameOriginPlanRequest(request({origin:'https://evil.invalid'},'https://evil.invalid'), 'production'),false);
});
test('dev and test allow only the request’s exact loopback origin',()=>{
 const request=(url,origin)=>new Request(url+'/test',{method:'POST',headers:{origin}});
 for(const host of ['http://localhost:3000','http://127.0.0.1:3000','http://[::1]:3000'])
  assert.equal(isSameOriginPlanRequest(request(host,host),'development'),true);
 assert.equal(isSameOriginPlanRequest(request('http://localhost:3000','http://localhost:3001'),'development'),false);
 assert.equal(isSameOriginPlanRequest(request('https://evil.invalid','https://evil.invalid'),'test'),false);
 const alias=(host)=>new Request('http://localhost:3000/test',{method:'POST',headers:{host,origin:'http://127.0.0.1:3000'}});
 assert.equal(isSameOriginPlanRequest(alias('127.0.0.1:3000'),'development'),true);
 assert.equal(isSameOriginPlanRequest(alias('127.0.0.1:3001'),'development'),false);
 const inconsistent=new Request('http://localhost:3000/test',{method:'POST',headers:{host:'127.0.0.1:3000',origin:'http://localhost:3000'}});
 assert.equal(isSameOriginPlanRequest(inconsistent,'development'),false);
 assert.equal(isSameOriginPlanRequest(alias('127.0.0.1:3000'),'production'),false);
});
test('budget applies to real streamed bytes; JSON-only and invalid UTF-8 fails closed',async()=>{
 const request=(body,headers={})=>new Request('https://wgos.invalid/test',{method:'POST',headers:{'content-type':'application/json',...headers},body});
 const valid=JSON.stringify({items:[fixture()]});
 assert.deepEqual(await readPlanJson(request(valid)),JSON.parse(valid));
 await assert.rejects(readPlanJson(request(valid,{'content-type':'text/plain'})),{status:415});
 await assert.rejects(readPlanJson(request(' '.repeat(STUDIO_PLAN_MAX_BYTES+1))),{status:413});
 await assert.rejects(readPlanJson(request(new Uint8Array([255]))),{status:400});
});
test('equipment scratch multiplies known rates by explicit quantities and days; unknown blocks entire subtotal',()=>{
 const {plannedRentalSubtotal}=require('../lib/studio-planned-equipment-input.ts');
 const complete=[{quantity:'3',rentalRatePerDayCents:12353},{quantity:'2',rentalRatePerDayCents:100}];
 assert.deepEqual(plannedRentalSubtotal([],''),{kind:'empty'});
 assert.deepEqual(plannedRentalSubtotal(complete,'2'),{kind:'subtotal',cents:74518});
 assert.deepEqual(plannedRentalSubtotal(complete,''),{kind:'incomplete'});
 assert.deepEqual(plannedRentalSubtotal([...complete,{quantity:'1',rentalRatePerDayCents:null}],'2'),{kind:'incomplete'});
 assert.deepEqual(plannedRentalSubtotal([{quantity:'0',rentalRatePerDayCents:12353}],'2'),{kind:'incomplete'});
});
test('POST denies origin before sign-in and both unauthorized roles before any storage access',async()=>{
 const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
 const input=require('../lib/studio-planned-equipment-input.ts');
 const src=ts.transpileModule(fs.readFileSync('app/api/admin/pursuits/planned-equipment/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const calls=[];
 let acceptIdentity=false,acceptBrand=false;
 const ctx={exports:{},require(name){
  if(name==='next/server')return {NextResponse:{json:(body,{status,headers})=>({body,status,headers})}};
  if(name.endsWith('/authz'))return {
   requireApiUser:async()=>{calls.push('identity');return acceptIdentity?{ok:true,identity:{auth_user_id:'qa-manager'}}:{ok:false,status:401,error:'AUTHENTICATION_REQUIRED'};},
   requireApiBrandAdmin:async(_identity,brand)=>{calls.push(brand);return acceptBrand?{ok:true}:{ok:false,status:403,error:'BRAND_ADMIN_REQUIRED'};},
  };
  if(name.endsWith('/studio-planned-equipment'))return {importStudioPlannedEquipment:async()=>{calls.push('write');return {conflicts:[],items:[]};}};
  if(name.endsWith('/studio-planned-equipment-input'))return input;
  throw Error(name);
 }};
 vm.runInNewContext(src,ctx);
 const request=(origin)=>new Request('http://localhost:4527/api/admin/pursuits/planned-equipment',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({items:[fixture()]})});
 assert.equal((await ctx.exports.POST(request('https://foreign.invalid'))).status,403);
 assert.deepEqual(calls,[]);
 assert.equal((await ctx.exports.POST(request('https://wgos.app'))).status,401);
 assert.deepEqual(calls.splice(0),['identity']);
 acceptIdentity=true;
 assert.equal((await ctx.exports.POST(request('https://wgos.app'))).status,403);
 assert.deepEqual(calls.splice(0),['identity','studio2016']);
 acceptBrand=true;
 const accepted=await ctx.exports.POST(request('https://wgos.app'));
 assert.equal(accepted.status,200);
 assert.equal(accepted.headers['Cache-Control'],'no-store, private');
 assert.deepEqual(calls,['identity','studio2016','write']);
});

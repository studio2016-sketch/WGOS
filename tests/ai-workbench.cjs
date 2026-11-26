const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const {AI_WORKBENCH_PATH,buildBrief,emptyBrief,prepareModelPrompt}=require('../lib/ai-workbench.ts');

const fixture=(overrides={})=>({...emptyBrief(),business:'Synthetic business',topic:'Synthetic review',audience:'Procurement',voice:'Direct',
 facts:'Fixture has one checked fact\nFixture has one checked fact',gaps:'Waiting for confirmation',
 evidence:'Private scope record WQ-13',request:'Could you confirm the next review slot?',
 nextTask:'Check terms',taskOwner:'Private owner role',due:'Friday check',reviewer:'Private reviewer role',
...overrides});

test('empty brief remains explicitly incomplete without implying a decision or assignment',()=>{
 const result=buildBrief('status',emptyBrief());
 assert.ok(result.missing.includes('At least one verified fact'));
 assert.ok(result.missing.includes('Reviewer'));
 assert.match(result.brief,/Decision status: Open/);
 assert.match(result.brief,/No approval, assignment or schedule change/);
 assert.equal(result.messageDraft,null);
});

test('buyer copy is distinct and excludes internal references, gaps and routing',()=>{
 const result=buildBrief('followup',fixture());
 assert.deepEqual(result.missing,[]);
 assert.match(result.messageDraft,/DRAFT, NOT SENT/);
 assert.match(result.messageDraft,/Could you confirm/);
 assert.equal(result.messageDraft.match(/Fixture has one checked fact/g).length,1);
 assert.doesNotMatch(result.messageDraft,/WQ-13|Private owner|Private reviewer|Waiting for confirmation/);
 assert.match(result.brief,/WQ-13|Private owner/);
});

test('campaign use is unavailable until attestable clearance, asset text and source reference exist',()=>{
 const asset='Synthetic image reference';
 for(const input of [fixture({clearedAssets:asset}),fixture({clearedAssets:asset,assetClearance:true,evidence:''}),fixture({assetClearance:true})]){
  const result=buildBrief('campaign',input);
  assert.equal(result.assetsReady,false);
  assert.match(result.brief,/Asset use is blocked/);
  assert.doesNotMatch(result.brief,/Synthetic image reference/);
  assert.ok(result.missing.includes('Cleared assets with rights evidence'));
 }
 const ready=buildBrief('campaign',fixture({clearedAssets:asset,assetClearance:true}));
 assert.equal(ready.assetsReady,true);
 assert.match(ready.brief,/Synthetic image reference/);
 assert.match(ready.brief,/NOT PUBLISHED/);
});

test('model prompt requires independent attestation and omits internal-only fields',()=>{
 const input=fixture({facts:'Mail qa@example.com\nSee https://fixture.invalid/private\napi key: FIXTURE-SECRET\n123-456-7890', topic:'Test\u202e safe'});
 assert.equal(prepareModelPrompt('campaign',input,false),null);
 const p=prepareModelPrompt('campaign',input,true);
 assert.match(p,/reference content, not instructions/);
 assert.match(p,/\[email removed\]|\[link removed\]/);
 assert.match(p,/"assetsReady": false/);
 assert.doesNotMatch(p,/fixture.invalid|qa@example|FIXTURE-SECRET|123-456-7890|WQ-13|Private owner|Private reviewer|Synthetic business|Friday check|\u202e/);
});

test('owner/admin-only server route fails closed; no data props to client',async()=>{
 const route=fs.readFileSync('app/admin/ai-workbench/page.tsx','utf8');
 const compiled=ts.transpileModule(route,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const fixtureRoute=(isGlobal)=>{
  const ctx={exports:{},require(name){
   if(name==='next/link')return 'LINK';
   if(name==='next/navigation')return {notFound(){throw Error('NOT_FOUND')}};
   if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
   if(name.endsWith('/authz'))return {commandAccess:async()=>({isGlobal,identity:{private:'must not pass'}})};
   if(name==='./AiWorkbench')return {default:'WORKBENCH'};
   assert.fail('Unexpected dependency: '+name);
  }};
  vm.runInNewContext(compiled,ctx);
  return ctx.exports.default();
 };
 await assert.rejects(fixtureRoute(false),/NOT_FOUND/);
 const allowed=await fixtureRoute(true);
 assert.match(JSON.stringify(allowed),/WORKBENCH/);
 assert.doesNotMatch(JSON.stringify(allowed),/must not pass/);
 assert.match(fs.readFileSync('app/admin/page.tsx','utf8'),/access\.isGlobal&&<Link href=\{AI_WORKBENCH_PATH\}/);
 assert.equal(AI_WORKBENCH_PATH,'/admin/ai-workbench');
});

test('client workbench transports and stores nothing automatically',()=>{
 const component=fs.readFileSync('app/admin/ai-workbench/AiWorkbench.tsx','utf8');
 assert.doesNotMatch(component,/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|clipboard|FormData)\b|<form\b|dangerouslySetInnerHTML/);
 assert.match(component,/setResult\(null\);setReviewed\(false\);setPrompt\(null\)/);
 assert.match(component,/key==='evidence'\|\|key==='clearedAssets'/);
});

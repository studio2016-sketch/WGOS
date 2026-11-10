const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/workspace-links.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {studioPursuitBrand,contractPursuitHref,CONTRACT_PURSUIT_URL}=context.exports;
const brands=[{id:'studio2016',name:'Studio2016'},{id:'retail',name:'Dionne’s Boutique'}];
assert.equal(studioPursuitBrand(brands).id,'studio2016');
assert.equal(studioPursuitBrand(brands,'studio2016').id,'studio2016');
assert.equal(studioPursuitBrand(brands,'retail'),undefined);
assert.equal(studioPursuitBrand(brands.slice(1)),undefined);
assert.equal(studioPursuitBrand([{id:'foreign',name:'Studio2016 vendor'}]),undefined);
assert.equal(contractPursuitHref('studio&test'),'/admin/pursuits?brand=studio%26test');
assert.equal(new URL(CONTRACT_PURSUIT_URL).protocol,'https:');
const routeSource=fs.readFileSync('app/admin/pursuits/page.tsx','utf8');
async function routeFor(visibleBrands,isGlobal){
 const queries=[];
 const ctx={exports:{},require(name){
  if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props})};
  if(name.includes('PursuitWorkspace'))return {default:'PursuitWorkspace'};
  if(name==='next/navigation')return {notFound(){throw Error('NOT_FOUND')}};
  if(name.includes('authz'))return {commandAccess:async()=>({isGlobal,identity:{auth_user_id:'qa-scoped-user'}})};
  if(name.includes('workspace-links'))return context.exports;
  if(name.includes('/db'))return {db:()=>async(strings,...values)=>{queries.push({text:strings.join('?'),values});return visibleBrands}};
  throw Error(name);
 }};
 vm.runInNewContext(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,ctx);
 return {run:()=>ctx.exports.default(),queries};
}
(async()=>{
 const owner=await routeFor(brands,true);assert.equal((await owner.run()).props.studio.id,'studio2016');
 const scoped=await routeFor([brands[0]],false);assert.equal((await scoped.run()).props.studio.id,'studio2016');
 assert.match(scoped.queries[0].text,/brand_memberships/);assert.match(scoped.queries[0].text,/m.active=true/);assert.equal(scoped.queries[0].values[0],'qa-scoped-user');
 const foreign=await routeFor([brands[1]],false);await assert.rejects(foreign.run(),/NOT_FOUND/);
 console.log('PASS: workspace visibility, selected-business scope, exact Studio2016 match, URL encoding, and scoped pursuit-route access.');
})().catch(e=>{console.error(e);process.exitCode=1});

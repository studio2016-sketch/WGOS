const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/workspace-links.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const {festivalBrand,festivalHref,UNUSED_URL}=context.exports;
const brands=[{id:'charmin-jermaine',name:'Charmin & Jermaine'},{id:'retail',name:'Dionne’s Boutique'}];
assert.equal(festivalBrand(brands).id,'charmin-jermaine');
assert.equal(festivalBrand(brands,'charmin-jermaine').id,'charmin-jermaine');
assert.equal(festivalBrand(brands,'retail'),undefined);
assert.equal(festivalBrand(brands.slice(1)),undefined);
assert.equal(festivalBrand([{id:'foreign',name:'Studio2016 vendor'}]),undefined);
assert.equal(festivalHref('studio&test'),'/admin/festivals?brand=studio%26test');

const routeSource=fs.readFileSync('app/admin/festivals/page.tsx','utf8');
async function routeFor(visibleBrands,isGlobal){
 const queries=[];
 const ctx={exports:{},require(name){
  if(name==='react/jsx-runtime')return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
  if(name.includes('FestivalWorkspace'))return {default:'FestivalWorkspace'};
  if(name.includes('AdminNav'))return {default:'AdminNav'};
  if(name.includes('festival-records'))return {default:[]};
  if(name.includes('festival-history'))return {default:{source:'Private history'}};
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
 const owner=await routeFor(brands,true);assert.equal((await owner.run()).props.children[0].props.brand,'charmin-jermaine');
 const scoped=await routeFor([brands[0]],false);assert.equal((await scoped.run()).props.children[0].props.brand,'charmin-jermaine');
 assert.match(scoped.queries[0].text,/brand_memberships/);assert.match(scoped.queries[0].text,/m.active=true/);assert.equal(scoped.queries[0].values[0],'qa-scoped-user');
 const foreign=await routeFor([brands[1]],false);await assert.rejects(foreign.run(),/NOT_FOUND/);
 console.log('PASS: festival brand visibility, scoped membership filtering, unauthorized route denial and URL encoding.');
})().catch(e=>{console.error(e);process.exitCode=1});

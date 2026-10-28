// Run from WGOS: node scripts/notify-search-engines.mjs --site=www.bassonebasses.com [--submit]
// Default is a dry run. Only this reviewed public allowlist can be submitted.
import {readFile} from 'node:fs/promises';
const sites=JSON.parse(await readFile(new URL('../docs/search-public-sites.json',import.meta.url),'utf8'));
const host=process.argv.find(a=>a.startsWith('--site='))?.slice(7);
const site=sites.find(s=>s.host===host);
if(!site)throw new Error('Choose an approved --site host from docs/search-public-sites.json.');
const urlList=site.paths.map(path=>new URL(path,'https://'+site.host).href);
for(const raw of urlList){const u=new URL(raw);if(u.host!==site.host||u.protocol!=='https:'||u.search||u.hash||/^\/(api|client|proposal|pay|sign|discovery)(\/|$)/.test(u.pathname))throw Error('Nonpublic URL rejected');}
if(!process.argv.includes('--submit')){console.log(JSON.stringify({host:site.host,urls:urlList,dryRun:true}));process.exit(0);}
async function get(url){const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Public verification failed: ${r.status} ${url}`);return {response:r,text:await r.text()};}
const keyLocation=`https://${site.host}/${site.key}.txt`;
if((await get(keyLocation)).text.trim()!==site.key)throw Error('The deployed ownership file does not match.');
const robots=(await get(`https://${site.host}/robots.txt`)).text;
if(/^\s*disallow:\s*\/\s*$/im.test(robots))throw Error('The site blocks indexing; submission refused.');
for(const url of urlList){const {response,text}=await get(url);if(/noindex/i.test(response.headers.get('x-robots-tag')||'')||/<meta\b(?=[^>]*\bname=["'](?:robots|googlebot|bingbot)["'])(?=[^>]*\bcontent=["'][^"']*noindex)[^>]*>/i.test(text))throw Error('Noindex page refused: '+url);}
const r=await fetch('https://api.indexnow.org/indexnow',{method:'POST',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify({host:site.host,key:site.key,keyLocation,urlList}),signal:AbortSignal.timeout(20000)});
if(![200,202].includes(r.status))throw Error('IndexNow rejected the submission: '+r.status);
console.log(JSON.stringify({host:site.host,urls:urlList.length,httpStatus:r.status,status:r.status===202?'received; key validation pending':'received',note:'Receipt does not establish crawling, indexing, rankings or sales.'}));

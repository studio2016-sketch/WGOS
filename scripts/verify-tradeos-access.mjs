import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const page=readFileSync(new URL("../app/admin/page.tsx",import.meta.url),"utf8");
const authz=readFileSync(new URL("../lib/authz.ts",import.meta.url),"utf8");
test("TradeOS launcher is server-rendered behind global access",()=>{
 assert.ok(!page.includes('"use client"'));
 assert.match(page,/const access=await commandAccess\(\)/);
 assert.match(page,/\{access\.isGlobal&&<section className="adminPanel" aria-label="TradeOS workspace">/);
 assert.match(authz,/const isGlobal=\["OWNER","ADMIN"\]\.includes\(String\(identity\.role\)\)/);
});
test("TradeOS link preserves app isolation and does not pass session or brand data",()=>{
 const links=[...page.matchAll(/<a\b[^>]*href="https:\/\/tradeos-lac\.vercel\.app"[^>]*>/g)];
 assert.equal(links.length,1);
 assert.match(links[0][0],/target="_blank"/);
 assert.match(links[0][0],/rel="noopener noreferrer"/);
 assert.match(links[0][0],/aria-label="Open TradeOS \(opens in a new tab\)"/);
 assert.ok(page.includes("TradeOS manages its own sign-in and permissions."));
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const target = process.argv[2] || path.join(__dirname, '../../app/api/admin/inventory/control/route.ts');
const src = fs.readFileSync(target,'utf8');
const check=(name,fn)=>test(name,fn);
check('requires an authenticated user',()=>assert.match(src,/await requireApiUser\(\)/));
check('requires business admin authorization',()=>assert.match(src,/await requireApiBrandAdmin\(auth\.identity,brandId\)/));
check('rejects blank business identifiers',()=>assert.match(src,/if\(!brandId\)return NextResponse\.json/));
check('rejects AUTHORITATIVE without owner approval workflow',()=>{
 assert.match(src,/if\(mode==="AUTHORITATIVE"\)\s*\{\s*return NextResponse\.json\(\{ok:false,error:"OWNER_APPROVED_CUTOVER_WORKFLOW_REQUIRED"\}/);
});
check('allows only SHADOW or READ_ONLY',()=>assert.match(src,/mode!=="SHADOW"&&mode!=="READ_ONLY"/));
check('does not accept a confirmation string as owner approval',()=>assert.doesNotMatch(src,/ACTIVATE_INVENTORY_AUTHORITY/));
check('contains exactly one SQL tagged statement',()=>assert.equal((src.match(/await sql`/g)||[]).length,1));
check('uses a single data-modifying CTE for state and audit',()=>{
 assert.match(src,/WITH changed AS \(\s*UPDATE wgos\.inventory_control_state/);
 assert.match(src,/INSERT INTO wgos\.audit_events/);
});
check('audit rows are derived from updated rows',()=>assert.match(src,/FROM changed\s+RETURNING id/));
check('requires audit insert success for successful response',()=>assert.match(src,/SELECT changed\.\* FROM changed JOIN logged ON true/));
check('does not update activation metadata',()=>{
 assert.doesNotMatch(src,/SET[^`]*activated_at\s*=/);
 assert.doesNotMatch(src,/SET[^`]*activated_by\s*=/);
});
check('sanitizes database errors',()=>{
 assert.match(src,/error:"INVENTORY_CONTROL_UNAVAILABLE"/);
 assert.doesNotMatch(src,/e\.message/);
});
check('does not expose secrets in logs',()=>assert.match(src,/console\.error\("WGOS_INVENTORY_CONTROL_WRITE_FAILED"\)/));

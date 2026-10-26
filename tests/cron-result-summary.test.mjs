import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeCronJobs,isQuotaFailure} from '../lib/cron-result-summary.ts';
const classify = (v) => summarizeCronJobs(['discovery'],[{status:'fulfilled',value:v}])[0].status;

test('production reproduction: 3 discovery failures must not be OK',()=>{
 assert.equal(classify({seen:60,sent:0,skipped:57,failed:3,errors:['Invalid to field']}),'FAILED');
});
test('no failures and zero sends can still be OK',()=>assert.equal(classify({seen:0,sent:0,failed:0,errors:[]}), 'OK'));
test('positive failed count with empty errors fails',()=>assert.equal(classify({failed:2,errors:[]}), 'FAILED'));
test('empty errors and failed zero remain OK',()=>assert.equal(classify({failed:0,errors:[]}), 'OK'));
test('non-empty errors without failed counter fail',()=>assert.equal(classify({errors:['provider refused']}),'FAILED'));
test('ok false fails',()=>assert.equal(classify({ok:false}),'FAILED'));
test('success false fails',()=>assert.equal(classify({success:false}),'FAILED'));
test('explicit ERROR status fails',()=>assert.equal(classify({status:'ERROR'}),'FAILED'));
test('explicit DEGRADED status fails',()=>assert.equal(classify({status:'DEGRADED'}),'FAILED'));
test('explicit FAILED status fails',()=>assert.equal(classify({status:'FAILED'}),'FAILED'));
test('configured false without failures skips',()=>assert.equal(classify({configured:false,failed:0,errors:[]}), 'SKIPPED'));
test('configured false with failure still fails',()=>assert.equal(classify({configured:false,failed:1}), 'FAILED'));
test('quota from errors array detected',()=>assert.equal(classify({failed:1,errors:['HTTP 402 quota exceeded']}), 'QUOTA_EXCEEDED'));
test('quota from statusCode detected',()=>assert.equal(classify({failed:1,statusCode:402}), 'QUOTA_EXCEEDED'));
test('quota from rejected Error detected',()=>assert.deepEqual(summarizeCronJobs(['a'],[{status:'rejected',reason:new Error('HTTP 402')}]),[{name:'a',status:'QUOTA_EXCEEDED'}]));
test('rejected generic Error fails',()=>assert.deepEqual(summarizeCronJobs(['a'],[{status:'rejected',reason:new Error('timeout')}]),[{name:'a',status:'FAILED'}]));
test('missing settled outcome fails',()=>assert.equal(summarizeCronJobs(['a'],[])[0].status,'FAILED'));
test('negative failed count does not falsely fail',()=>assert.equal(classify({failed:-1,errors:[]}), 'OK'));
test('numeric string failed does not falsely fail',()=>assert.equal(classify({failed:'3',errors:[]}), 'OK'));
test('isQuotaFailure does not match ordinary failure',()=>assert.equal(isQuotaFailure({errors:['Invalid to field']}),false));
test('mixed statuses remain per-job isolated',()=>assert.deepEqual(summarizeCronJobs(['discovery','gmail'],[{status:'fulfilled',value:{failed:3}},{status:'fulfilled',value:{configured:false}}]).map(x=>x.status),['FAILED','SKIPPED']));

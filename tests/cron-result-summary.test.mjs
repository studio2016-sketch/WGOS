import test from 'node:test';
import assert from 'node:assert/strict';
import { isQuotaFailure, summarizeCronJobs } from '../lib/cron-result-summary.ts';

const fulfilled = (value) => ({status:'fulfilled', value});
const rejected = (reason) => ({status:'rejected', reason});
const classify = (outcome) => summarizeCronJobs(['job'], [outcome])[0].status;

test('successful result is OK', () => assert.equal(classify(fulfilled({ok:true})), 'OK'));
test('unconfigured optional service is SKIPPED', () => assert.equal(classify(fulfilled({configured:false})), 'SKIPPED'));
test('reported failure is FAILED', () => assert.equal(classify(fulfilled({ok:false,error:'offline'})), 'FAILED'));
test('explicit success:false is FAILED', () => assert.equal(classify(fulfilled({success:false})), 'FAILED'));
test('rejected operation is FAILED', () => assert.equal(classify(rejected(new Error('network unavailable'))), 'FAILED'));
test('rejected 402 is QUOTA_EXCEEDED', () => assert.equal(classify(rejected(new Error('HTTP status 402'))), 'QUOTA_EXCEEDED'));
test('reported quota failure is QUOTA_EXCEEDED', () => assert.equal(classify(fulfilled({ok:false,error:'Your account or project has exceeded the quota'})), 'QUOTA_EXCEEDED'));
test('quota exceeded phrase is recognized', () => assert.equal(isQuotaFailure('quota exceeded'), true));
test('unrelated HTTP 403 is not quota', () => assert.equal(isQuotaFailure('HTTP 403 forbidden'), false));
test('missing outcome is FAILED', () => assert.equal(summarizeCronJobs(['job'],[])[0].status, 'FAILED'));
test('empty outcome list is empty', () => assert.deepEqual(summarizeCronJobs([],[]), []));
test('mixed outcomes preserve job names and order', () => assert.deepEqual(summarizeCronJobs(['a','b','c'],[fulfilled({ok:true}),fulfilled({configured:false}),rejected('quota exceeded')]),[{name:'a',status:'OK'},{name:'b',status:'SKIPPED'},{name:'c',status:'QUOTA_EXCEEDED'}]));
test('summary never contains private error or payload', () => {
 const secret='private-customer-token-123';
 const result=summarizeCronJobs(['job'],[fulfilled({ok:false,error:secret,payload:{token:secret}})]);
 assert.equal(JSON.stringify(result).includes(secret),false);
 assert.deepEqual(result,[{name:'job',status:'FAILED'}]);
});
test('a failed unconfigured result remains FAILED', () => assert.equal(classify(fulfilled({configured:false,ok:false})), 'FAILED'));

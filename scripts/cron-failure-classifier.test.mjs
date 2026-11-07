import test from 'node:test';
import assert from 'node:assert/strict';
import {reportedJobFailures} from '../lib/cron-failure-classifier.ts';

test('nested discovery failures degrade despite fulfilled promise', () => {
  assert.equal(reportedJobFailures({seen:60,sent:0,skipped:57,failed:3,errors:['bad','bad','bad']}),3);
});
test('skipped and not configured are not failures', () => {
  assert.equal(reportedJobFailures({seen:60,sent:0,skipped:60,failed:0,errors:[]}),0);
  assert.equal(reportedJobFailures({configured:false,threads:0,errors:0}),0);
});
test('error arrays count even without failed field', () => assert.equal(reportedJobFailures({errors:['one','two']}),2));
test('numeric errors count', () => assert.equal(reportedJobFailures({errors:4}),4));
test('explicit false status counts as failure', () => {
  assert.equal(reportedJobFailures({ok:false}),1);
  assert.equal(reportedJobFailures({success:false}),1);
});
test('explicit error string counts as failure', () => assert.equal(reportedJobFailures({error:'JOB_FAILED'}),1));
test('malformed or empty objects do not invent failures', () => {
  for (const x of [null,undefined,[],0,'bad',{}, {failed:0}, {failed:-1}, {errors:[]}])
    assert.equal(reportedJobFailures(x),0);
});
test('overlapping counters are not double-counted', () => {
  assert.equal(reportedJobFailures({failed:3,errors:['a','b','c'],ok:false}),3);
});
test('non-integer and unsafe counters are not treated as attempt counts', () => {
  assert.equal(reportedJobFailures({failed:1.5,errors:NaN}),0);
  assert.equal(reportedJobFailures({failed:Number.MAX_SAFE_INTEGER+1}),0);
});

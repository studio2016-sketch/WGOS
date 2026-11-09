const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const queries=[];
let result=[];
const sql=async(strings,...values)=>{
 queries.push({text:strings.reduce((s,part,i)=>s+(i?'$'+i:'')+part,''),values});
 return result;
};
const context={exports:{},require(name){
 if(name==='server-only')return {};
 if(name==='./db')return {db:()=>sql};
 throw Error(name);
}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/retail-orders.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
const {paidOrderQueue,orderQueueOptions}=context.exports;
(async()=>{
 for(const bad of ['0','-1','1.5','NaN','Infinity','1 OR 1=1',['2']])assert.equal(orderQueueOptions({orderPage:bad}).page,1);
 assert.equal(orderQueueOptions({orders:'wrong'}).filter,'ALL');
 result=Array.from({length:51},(_,i)=>({id:String(i)}));
 const first=await paidOrderQueue('dionnesBoutique',{});
 assert.equal(first.orders.length,50);assert.equal(first.hasNext,true);
 result=Array.from({length:7},(_,i)=>({id:String(i+50)}));
 const second=await paidOrderQueue('dionnesBoutique',{orderPage:'2'});
 assert.equal(second.orders.length,7);assert.equal(second.hasNext,false);
 await paidOrderQueue('dionnesBoutique',{orders:'REVIEW'});
 await paidOrderQueue('unrelated-fixture-brand',{});
 if(!process.argv.includes('--sql')){console.log('Order queue input, page boundary, and continuation checks passed.');return;}
 // Execute the actual captured tagged queries against synthetic DB rows. No
 // credentials or network access are needed to generate this regression SQL.
 const literal=value=>typeof value==='number'?String(value):"'"+value.replaceAll("'","''")+"'";
 const rendered=queries.map(({text,values})=>text.replace(/\$(\d+)/g,(_,i)=>literal(values[Number(i)-1])));
 const tests=rendered.map((query,i)=>`SELECT count(*),count(*) FILTER (WHERE fulfillment_status='REVIEW') INTO n,r FROM (${query}) q; IF n<>${[51,7,2,0][i]} OR r<>${[2,0,2,0][i]} THEN RAISE EXCEPTION 'Captured queue query ${i} failed: count=%, review=%',n,r; END IF;`).join('\n');
 process.stdout.write(`-- Run only on an isolated QA database; all fixture changes roll back.
DO $qa$ DECLARE before_count bigint; n bigint; r bigint;
BEGIN
 SELECT count(*) INTO before_count FROM wgos.retail_orders;
 BEGIN
  INSERT INTO wgos.retail_orders(brand_id,stripe_account_id,stripe_session_id,payment_status,fulfillment_status,amount_total,currency,items,created_at)
  SELECT 'dionnesBoutique','acct_fixture','cs_fixture_Queue'||i,'PAID','READY',100,'usd','[]'::jsonb,'2026-11-09'::timestamptz+i*interval '1 minute' FROM generate_series(1,55) i;
  INSERT INTO wgos.retail_orders(brand_id,stripe_account_id,stripe_session_id,payment_status,fulfillment_status,amount_total,currency,items,review_reason,created_at)
  SELECT 'dionnesBoutique','acct_fixture','cs_fixture_OldReview'||i,'PAID','REVIEW',100,'usd','[]'::jsonb,'Fixture review','2026-01-01'::timestamptz+i*interval '1 minute' FROM generate_series(1,2) i;
  -- Reproduce the old UI defect: both old review orders are hidden by LIMIT 50.
  SELECT count(*) FILTER (WHERE fulfillment_status='REVIEW') INTO r FROM (SELECT fulfillment_status FROM wgos.retail_orders WHERE brand_id='dionnesBoutique' ORDER BY created_at DESC LIMIT 50) old_queue;
  IF r<>0 THEN RAISE EXCEPTION 'Expected hidden-review regression fixture'; END IF;
  ${tests}
  RAISE EXCEPTION USING ERRCODE='ZQ001',MESSAGE='Rollback successful queue fixtures';
 EXCEPTION WHEN SQLSTATE 'ZQ001' THEN NULL;
 END;
 IF (SELECT count(*) FROM wgos.retail_orders)<>before_count THEN RAISE EXCEPTION 'Queue fixtures persisted'; END IF;
END $qa$;
`);
})().catch(error=>{console.error(error);process.exit(1)});

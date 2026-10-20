import "server-only";
import {db} from "./db";

/**
 * Read-only financial exception detector. This is not an accounts-receivable ledger:
 * payments are WGOS-recorded transactions, not independently bank-reconciled funds.
 * It cannot send a payment demand, settle a payment or alter a contract.
 */
export async function observeDepositExceptions(input:{limit?:number;dryRun?:boolean}={}){
 const sql=db(),limit=Math.max(1,Math.min(Number(input.limit||50),200));
 const rows:any[]=await sql`
  SELECT a.id AS agreement_id,a.signed_at,p.id AS proposal_id,
         p.brand_id,p.deposit_amount,p.currency,
         COALESCE(SUM(pay.amount) FILTER(WHERE pay.status IN ('PAID','SUCCEEDED')),0)::numeric AS recorded_paid
  FROM wgos.agreements a
  JOIN wgos.proposals p ON p.id=a.proposal_id
  LEFT JOIN wgos.payments pay ON pay.proposal_id=p.id
  WHERE a.status='SIGNED' AND p.deposit_amount>0
    AND a.signed_at IS NOT NULL AND a.signed_at<now()-interval '24 hours'
  GROUP BY a.id,a.signed_at,p.id,p.brand_id,p.deposit_amount,p.currency
  HAVING COALESCE(SUM(pay.amount) FILTER(WHERE pay.status IN ('PAID','SUCCEEDED')),0) < p.deposit_amount
  ORDER BY a.signed_at ASC LIMIT ${limit}`;
 const candidates:any[]=[];let created=0,suppressed=0;
 for(const row of rows){
  const payload={
   source:"WGOS_CONTRACT_AND_PAYMENT_RECORDS",rule:"WGOS_DEPOSIT_REVIEW_V1",
   agreement_id:String(row.agreement_id),proposal_id:String(row.proposal_id),
   deposit_required:Number(row.deposit_amount),
   paid_recorded:Number(row.recorded_paid),
   possible_gap:Number(row.deposit_amount)-Number(row.recorded_paid),
   currency:String(row.currency).trim(),
   warning:"Recorded payment status only; independently verify settlement and terms before contacting the client."
  };
  if(input.dryRun){candidates.push({brand_id:row.brand_id,...payload});continue;}
  const inserted:any[]=await sql`
   INSERT INTO wgos.notification_events
     (brand_id,recipient_subject,channel,event_type,status,payload)
   SELECT ${String(row.brand_id)},'OWNER','IN_APP','DEPOSIT_REVIEW_REQUIRED','PENDING',${JSON.stringify(payload)}::jsonb
   WHERE NOT EXISTS(
     SELECT 1 FROM wgos.notification_events
     WHERE brand_id=${String(row.brand_id)}
       AND event_type='DEPOSIT_REVIEW_REQUIRED'
       AND payload->>'agreement_id'=${String(row.agreement_id)}
       AND created_at>now()-interval '7 days'
   )
   RETURNING id`;
  if(inserted.length)created++;else suppressed++;
 }
 return {scanned:rows.length,created,suppressed,dryRun:Boolean(input.dryRun),candidates:input.dryRun?candidates:undefined};
}

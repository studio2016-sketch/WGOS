import "server-only";
import {db} from "./db";
import {stripe} from "./stripe";

function publicBase(){return String(process.env.WGOS_PUBLIC_BASE_URL||"https://wgos.app").replace(/\/$/,"");}
function brandBase(domain:any){const host=String(domain||"").trim().replace(/^https?:\/\//,"").replace(/\/$/,"");return host?`https://${host}`:publicBase();}
function moneyToCents(value:any){const amount=Number(value||0);if(!Number.isFinite(amount)||amount<=0)throw new Error("A positive payment amount is required.");return Math.round(amount*100);}

export async function createAgreementCheckout(input:{agreementId:string;actor:string}){
 const sql=db();
 const rows:any[]=await sql`SELECT a.id agreement_id,a.status agreement_status,p.id proposal_id,p.brand_id,p.currency,p.deposit_amount,p.one_time_total,p.title proposal_title,s.id snapshot_id,s.client_email,b.name brand_name,x.public_domain,x.payment_path_prefix,pp.payment_mode,pp.complete_for_payment,pp.statement_descriptor
 FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id JOIN wgos.accepted_snapshots s ON s.proposal_id=p.id AND s.proposal_version=p.version
 JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=p.brand_id LEFT JOIN wgos.brand_payment_profiles pp ON pp.brand_id=p.brand_id
 WHERE a.id=${input.agreementId}::uuid ORDER BY s.accepted_at DESC LIMIT 1`;
 const row:any=rows[0];
 if(!row)throw new Error("Agreement or accepted proposal snapshot not found.");
 if(String(row.agreement_status)!=="SIGNED")throw new Error("A completed signature is required before payment collection.");
 if(!row.complete_for_payment||String(row.payment_mode)!=="DIRECT_STRIPE_ACCOUNT")throw new Error("Direct Stripe Checkout is not commissioned for this brand.");
 const deposit=Number(row.deposit_amount||0);const total=Number(row.one_time_total||0);const amount=deposit>0?deposit:total;
 const currency=String(row.currency||"USD").trim().toLowerCase();
 const client=stripe();
 const session=await client.checkout.sessions.create({
  mode:"payment",customer_email:row.client_email||undefined,
  line_items:[{price_data:{currency,product_data:{name:deposit>0?`${row.brand_name} — Booking Deposit`:`${row.brand_name} — Payment`,description:String(row.proposal_title||"Service agreement")},unit_amount:moneyToCents(amount)},quantity:1}],
  metadata:{wgos_agreement_id:String(row.agreement_id),wgos_proposal_id:String(row.proposal_id),wgos_snapshot_id:String(row.snapshot_id),wgos_brand_id:String(row.brand_id),wgos_payment_kind:deposit>0?"DEPOSIT":"FULL_PAYMENT"},
  payment_intent_data:{metadata:{wgos_agreement_id:String(row.agreement_id),wgos_proposal_id:String(row.proposal_id),wgos_brand_id:String(row.brand_id)},statement_descriptor:row.statement_descriptor?String(row.statement_descriptor).slice(0,22):undefined},
  success_url:`${brandBase(row.public_domain)}${String(row.payment_path_prefix||"/pay").replace(/\/$/,"")}/complete?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${brandBase(row.public_domain)}${String(row.payment_path_prefix||"/pay").replace(/\/$/,"")}/cancelled`,integration_identifier:"wgos_checkout_hzdpmqzr"
 });
 if(!session.url)throw new Error("Stripe did not return a checkout URL.");
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'STRIPE_CHECKOUT_CREATED','agreement',${String(row.agreement_id)},jsonb_build_object('proposalId',${String(row.proposal_id)},'sessionId',${session.id},'amount',${amount}))`;
 return {url:session.url,sessionId:session.id,amount,currency:currency.toUpperCase()};
}

export async function recordStripeCheckoutPayment(sessionId:string){
 const client=stripe();const session=await client.checkout.sessions.retrieve(sessionId);
 if(session.payment_status!=="paid")return {recorded:false,reason:"PAYMENT_NOT_PAID"};
 const meta=session.metadata||{};const proposalId=String(meta.wgos_proposal_id||"");const snapshotId=String(meta.wgos_snapshot_id||"");
 if(!proposalId||!snapshotId)throw new Error("WGOS payment metadata is missing.");
 const amount=Number(session.amount_total||0)/100;if(amount<=0)throw new Error("Stripe checkout amount is invalid.");
 const sql=db();const existing:any[]=await sql`SELECT id FROM wgos.payments WHERE provider='STRIPE' AND provider_external_id=${session.id} LIMIT 1`;
 if(existing[0])return {recorded:false,duplicate:true};
 const inserted:any[]=await sql`INSERT INTO wgos.payments(proposal_id,snapshot_id,kind,amount,currency,status,provider,provider_external_id,paid_at) VALUES(${proposalId}::uuid,${snapshotId}::uuid,${String(meta.wgos_payment_kind||'DEPOSIT')},${amount},${String(session.currency||'usd').toUpperCase()},'PAID','STRIPE',${session.id},now()) RETURNING id`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('service:stripe','PAYMENT_CONFIRMED','payment',${String(inserted[0].id)},jsonb_build_object('sessionId',${session.id},'proposalId',${proposalId},'amount',${amount}))`;
 return {recorded:true,paymentId:String(inserted[0].id)};
}

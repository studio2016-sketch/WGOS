import "server-only";
import {db} from "./db";
import {stripe,stripeForEnv} from "./stripe";

export async function publicCheckoutStatus(sessionId:string,brandId?:string){
 if(!/^cs_[A-Za-z0-9_]+$/.test(sessionId))return null;
 let client;
 if(brandId){
  const sql=db();const rows:any[]=await sql`SELECT secret_env_var FROM wgos.brand_payment_profiles WHERE brand_id=${brandId} LIMIT 1`;
  if(!rows[0])return null;client=stripeForEnv(String(rows[0].secret_env_var||""));
 }else client=stripe();
 const session=await client.checkout.sessions.retrieve(sessionId);
 const meta=session.metadata||{};
 if(!meta.wgos_proposal_id||!meta.wgos_brand_id)return null;
 if(brandId&&String(meta.wgos_brand_id)!==String(brandId))return null;
 return {
  paymentStatus:String(session.payment_status||"unpaid").toUpperCase(),
  status:String(session.status||"").toUpperCase(),
  amountTotal:Number(session.amount_total||0),
  currency:String(session.currency||"usd").toUpperCase(),
  brandId:String(meta.wgos_brand_id),
  agreementId:String(meta.wgos_agreement_id||""),
  proposalId:String(meta.wgos_proposal_id||""),
  paymentKind:String(meta.wgos_payment_kind||"PAYMENT"),
  checkoutUrl:session.payment_status==="paid"?null:(session.status==="open"?session.url||null:null)
 };
}
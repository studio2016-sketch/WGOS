import "server-only";
import {stripe} from "./stripe";

export async function publicCheckoutStatus(sessionId:string){
 if(!/^cs_[A-Za-z0-9_]+$/.test(sessionId))return null;
 const session=await stripe().checkout.sessions.retrieve(sessionId);
 const meta=session.metadata||{};
 if(!meta.wgos_proposal_id||!meta.wgos_brand_id)return null;
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
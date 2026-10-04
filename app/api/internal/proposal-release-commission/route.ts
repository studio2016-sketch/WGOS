import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {updateProposalFinancials,approveProposal} from "../../../../lib/documents";
import {issueProposalAccess} from "../../../../lib/proposal-access";

export async function GET(req:Request){
 const key=new URL(req.url).searchParams.get("key")||"";
 if(!process.env.DISCOVERY_COMMISSION_SECRET||key!==process.env.DISCOVERY_COMMISSION_SECRET)return NextResponse.json({ok:false},{status:401});
 const sql=db();
 try{
  const rows:any[]=await sql`
   SELECT p.id,p.status,p.opportunity_id,c.email
   FROM wgos.proposals p
   JOIN wgos.opportunities o ON o.id=p.opportunity_id
   JOIN wgos.brands b ON b.id=p.brand_id
   LEFT JOIN wgos.contacts c ON c.id=o.primary_contact_id
   LEFT JOIN wgos.organizations org ON org.id=o.organization_id
   WHERE b.name='Studio2016'
     AND org.name='Studio2016 Internal Commissioning'
     AND p.status IN ('DRAFT','APPROVED','SENT')
   ORDER BY p.created_at DESC
   LIMIT 1`;
  const p=rows[0];
  if(!p)return NextResponse.json({ok:false,error:"COMMISSIONING_PROPOSAL_NOT_FOUND"},{status:404});
  const actor="system:commissioning-test";
  if(p.status==="DRAFT"){
   await updateProposalFinancials({proposalId:String(p.id),oneTimeTotal:0.5,depositAmount:0.5,actor});
   await approveProposal({proposalId:String(p.id),actor});
  }
  const access=await issueProposalAccess({proposalId:String(p.id),actor});
  const to=String(p.email||"").trim();
  if(!to)throw new Error("Commissioning contact email unavailable.");
  const endpoint="https://www.studio2016.com/api/wgos/client-email";
  const secret=process.env.WGOS_DISCOVERY_SHARED_SECRET||"";
  if(!secret)throw new Error("Client email shared secret unavailable.");
  const email=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-wgos-discovery-secret":secret},body:JSON.stringify({
   to,
   replyTo:"booking@studio2016.com",
   eyebrow:"STUDIO2016 · PRIVATE PROPOSAL",
   subject:"Your Studio2016 production proposal is ready",
   body:"Your Studio2016 production proposal is ready for review. We have translated the discovery response into a proposed approach and protected the client view behind a private access link.\n\nReview and approve the proposal here:\n"+String(access.url||"")+"\n\nThis is the controlled Studio2016 commissioning engagement, with a $0.50 total and $0.50 deposit so the remaining acceptance, agreement, payment, activation, and client-workspace lifecycle can be verified end to end."
  })});
  const result:any=await email.json().catch(()=>({}));
  if(!email.ok)throw new Error(String(result.error||"Client proposal email failed."));
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
   VALUES(${actor},'COMMISSIONING_PROPOSAL_ISSUED','proposal',${String(p.id)},jsonb_build_object('recipient',${to}::text,'emailId',${String(result.id||"")}::text))`;
  return NextResponse.json({ok:true,proposalId:String(p.id),to,url:access.url,emailId:result.id||null},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"commission_failed"},{status:500});
 }
}

import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";

export async function GET(req:Request){
 const key=new URL(req.url).searchParams.get("key")||"";
 if(!process.env.DISCOVERY_COMMISSION_SECRET||key!==process.env.DISCOVERY_COMMISSION_SECRET)return NextResponse.json({ok:false},{status:401});
 const sql=db();
 try{
  const rows:any[]=await sql`
   SELECT p.id,p.status,p.opportunity_id,o.title opportunity_title
   FROM wgos.proposals p
   JOIN wgos.opportunities o ON o.id=p.opportunity_id
   JOIN wgos.brands b ON b.id=p.brand_id
   LEFT JOIN wgos.organizations org ON org.id=o.organization_id
   WHERE b.name='Studio2016'
     AND org.name='Studio2016 Internal Commissioning'
   ORDER BY p.created_at DESC LIMIT 1`;
  const p=rows[0];
  if(!p)return NextResponse.json({ok:false,error:"PROPOSAL_NOT_FOUND"},{status:404});
  await sql`UPDATE wgos.proposal_access_tokens SET revoked_at=now()
    WHERE proposal_id=${String(p.id)}::uuid AND purpose='CLIENT_PROPOSAL' AND revoked_at IS NULL`;
  await sql`UPDATE wgos.proposals SET status='DRAFT',sent_at=NULL,approved_at=NULL,approved_by_subject=NULL,updated_at=now()
    WHERE id=${String(p.id)}::uuid`;
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
    VALUES('system:commissioning-correction','PROPOSAL_CLIENT_RELEASE_REVOKED','proposal',${String(p.id)},
      jsonb_build_object('reason','OWNER_REVIEW_REQUIRED_BEFORE_CLIENT_RELEASE'))`;
  const secret=process.env.WGOS_DISCOVERY_SHARED_SECRET||"";
  const email=await fetch("https://www.studio2016.com/api/wgos/client-email",{method:"POST",headers:{"content-type":"application/json","x-wgos-discovery-secret":secret},body:JSON.stringify({
    to:"jermaine@studio2016.com",
    replyTo:"booking@studio2016.com",
    eyebrow:"STUDIO2016 · OWNER REVIEW",
    subject:"Studio2016 proposal ready for owner review",
    body:"A proposal draft has been prepared from the completed discovery record and is now held for owner review. Client access has been revoked until you approve the scope, pricing, deposit, assumptions, and boundaries.\n\nOpen WGOS to review the proposal before release:\nhttps://wgos.app/admin\n\nCommissioning proposal: "+String(p.opportunity_title||"Studio2016 production proposal")+"\nProposal ID: "+String(p.id)+"\n\nNo client-facing proposal should be issued until owner approval is recorded."
  })});
  const result:any=await email.json().catch(()=>({}));
  if(!email.ok)throw new Error(String(result.error||"OWNER_REVIEW_EMAIL_FAILED"));
  return NextResponse.json({ok:true,proposalId:String(p.id),status:"DRAFT",ownerEmail:"jermaine@studio2016.com",emailId:result.id||null});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"correction_failed"},{status:500});}
}

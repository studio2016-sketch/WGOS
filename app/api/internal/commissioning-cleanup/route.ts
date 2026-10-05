import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";

export async function GET(){

 const sql=db();
 try{
  const rows:any[]=await sql`
    SELECT p.id,p.opportunity_id,p.version,p.one_time_total,p.deposit_amount,p.status
    FROM wgos.proposals p
    JOIN wgos.opportunities o ON o.id=p.opportunity_id
    LEFT JOIN wgos.organizations org ON org.id=o.organization_id
    JOIN wgos.brands b ON b.id=p.brand_id
    WHERE b.name='Studio2016'
      AND org.name='Studio2016 Internal Commissioning'
      AND p.status='DRAFT'
    ORDER BY p.version DESC,p.created_at DESC`;
  const current=rows.find((p:any)=>Number(p.one_time_total)===0.5&&Number(p.deposit_amount)===0.5)||rows[0];
  if(!current)return NextResponse.json({ok:false,error:"CURRENT_COMMISSIONING_PROPOSAL_NOT_FOUND"},{status:404});
  const old=rows.filter((p:any)=>String(p.id)!==String(current.id));
  for(const p of old){
    await sql`UPDATE wgos.proposals SET content=COALESCE(content,'{}'::jsonb)||jsonb_build_object('archivedCommissioning',true),updated_at=now() WHERE id=${String(p.id)}::uuid`;
    await sql`UPDATE wgos.opportunities SET source='COMMISSIONING_ARCHIVED',stage='LOST',updated_at=now() WHERE id=${String(p.opportunity_id)}::uuid`;
    await sql`UPDATE wgos.notification_events SET status='READ' WHERE status='PENDING' AND (
      payload->>'proposal_id'=${String(p.id)} OR payload->>'opportunity_id'=${String(p.opportunity_id)}
    )`;
  }
  await sql`UPDATE wgos.notification_events n SET status='READ'
    FROM wgos.brands b
    WHERE n.brand_id=b.id AND b.name='Studio2016'
      AND n.status='PENDING'
      AND n.event_type='DISCOVERY_AUTOMATION_FAILED'`;
  await sql`UPDATE wgos.contacts c SET role='ARCHIVED_COMMISSIONING',updated_at=now()
    FROM wgos.organizations org
    WHERE c.organization_id=org.id
      AND org.name='Studio2016 Internal Commissioning'
      AND lower(COALESCE(c.email,''))<>'booking@studio2016.com'`;
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
    VALUES('system:commissioning-cleanup','COMMISSIONING_ARTIFACTS_ARCHIVED','proposal',${String(current.id)},
      ${JSON.stringify({keptProposalId:String(current.id),archivedProposalIds:old.map((x:any)=>String(x.id)),keptOpportunityId:String(current.opportunity_id)})}::jsonb)`;
  return NextResponse.json({ok:true,kept:{proposalId:String(current.id),opportunityId:String(current.opportunity_id),version:Number(current.version)},archived:old.map((x:any)=>({proposalId:String(x.id),opportunityId:String(x.opportunity_id),version:Number(x.version)}))});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"cleanup_failed"},{status:500});}
}

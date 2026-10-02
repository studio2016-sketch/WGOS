import "server-only";
import {db} from "./db";
import {createAgreementFromAcceptedProposal} from "./commercial-lifecycle";

export async function processClientDecisionEvents(input:{limit?:number}={}){
 const sql=db(),limit=Math.max(1,Math.min(Number(input.limit||100),250));
 const events:any[]=await sql`SELECT id,brand_id,topic,payload FROM wgos.outbox_events WHERE topic IN ('CLIENT_DECISION','PROPOSAL_ACCEPTED','AGREEMENT_SIGNED','PAYMENT_CONFIRMED') AND status='PENDING' AND next_attempt_at<=now() ORDER BY created_at LIMIT ${limit}`;
 let processed=0,advanced=0,failed=0;
 for(const event of events){
  try{
   const payload=event.payload||{},decision=String(payload.decision||""),entityType=String(payload.entity_type||""),entityId=String(payload.entity_id||"");
   if(event.topic==="PROPOSAL_ACCEPTED"){
    const proposalId=String(payload.proposal_id||"");
    try{
     const agreement:any=await createAgreementFromAcceptedProposal({proposalId,actor:"system:workflow"});
     await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload) VALUES(${event.brand_id},'OWNER','IN_APP','AGREEMENT_PREPARED','PENDING',jsonb_build_object('proposal_id',${proposalId},'agreement_id',${String(agreement.id)}))`;
     advanced++;
    }catch(e){
     const msg=e instanceof Error?e.message:"Agreement preparation failed";
     if(msg.includes("Approved agreement terms are required")){
      await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload) VALUES(${event.brand_id},'OWNER','IN_APP','AGREEMENT_SETUP_REQUIRED','PENDING',jsonb_build_object('proposal_id',${proposalId},'reason',${msg}))`;
     }else throw e;
    }
   }
   if(event.topic==="AGREEMENT_SIGNED"){
    const agreementId=String(payload.agreement_id||"");
    const rows:any[]=await sql`SELECT a.id,p.id proposal_id,p.deposit_amount,
      COALESCE((SELECT sum(pay.amount) FROM wgos.payments pay WHERE pay.proposal_id=p.id AND pay.status IN ('PAID','SUCCEEDED')),0)::numeric paid
     FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id WHERE a.id=${agreementId}::uuid LIMIT 1`;
    const a=rows[0];if(a){
     const deposit=Number(a.deposit_amount||0),paid=Number(a.paid||0);
     await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload)
      VALUES(${event.brand_id},'OWNER','IN_APP',${deposit>paid?'PAYMENT_REQUIRED':'DELIVERY_READY_FOR_ACTIVATION'},'PENDING',
       jsonb_build_object('agreement_id',${agreementId},'proposal_id',${String(a.proposal_id)},'deposit_required',${deposit},'paid',${paid}))`;
    }
   }
   if(event.topic==="PAYMENT_CONFIRMED"){
    const proposalId=String(payload.proposal_id||"");
    const rows:any[]=await sql`SELECT p.id,p.deposit_amount,a.id agreement_id,a.status agreement_status,
      COALESCE((SELECT sum(pay.amount) FROM wgos.payments pay WHERE pay.proposal_id=p.id AND pay.status IN ('PAID','SUCCEEDED')),0)::numeric paid
     FROM wgos.proposals p LEFT JOIN LATERAL(SELECT id,status FROM wgos.agreements aa WHERE aa.proposal_id=p.id ORDER BY aa.created_at DESC LIMIT 1)a ON true
     WHERE p.id=${proposalId}::uuid LIMIT 1`;
    const p=rows[0];if(p&&p.agreement_status==="SIGNED"&&Number(p.paid||0)>=Number(p.deposit_amount||0)){
     await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload)
      VALUES(${event.brand_id},'OWNER','IN_APP','DELIVERY_READY_FOR_ACTIVATION','PENDING',
       jsonb_build_object('proposal_id',${proposalId},'agreement_id',${String(p.agreement_id)},'paid',${Number(p.paid||0)}))`;
    }
   }
   if(event.topic==="CLIENT_DECISION"&&entityType==="task"&&decision==="APPROVED"){
    const rows:any[]=await sql`UPDATE wgos.tasks SET status='DONE',completed_at=COALESCE(completed_at,now()),updated_at=now() WHERE id=${entityId}::uuid AND requires_approval=true AND status NOT IN ('DONE','CANCELLED') RETURNING id,project_id,title`;
    if(rows[0]){
     advanced++;
     await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('system:workflow','TASK_COMPLETED_BY_CLIENT_APPROVAL','TASK',${entityId},jsonb_build_object('outbox_event_id',${String(event.id)}))`;
     const deps:any[]=await sql`SELECT d.task_id FROM wgos.task_dependencies d JOIN wgos.tasks t ON t.id=d.task_id WHERE d.depends_on_task_id=${entityId}::uuid AND t.status='WAITING'`;
     for(const d of deps){
      const blockers:any[]=await sql`SELECT count(*)::int AS n FROM wgos.task_dependencies x JOIN wgos.tasks upstream ON upstream.id=x.depends_on_task_id WHERE x.task_id=${d.task_id}::uuid AND upstream.status<>'DONE'`;
      if(Number(blockers[0]?.n||0)===0){
       await sql`UPDATE wgos.tasks SET status='READY',updated_at=now() WHERE id=${d.task_id}::uuid AND status='WAITING'`;
       await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES('system:workflow','TASK_RELEASED_AFTER_DEPENDENCIES','TASK',${String(d.task_id)},jsonb_build_object('trigger_task_id',${entityId}))`;
      }
     }
    }
   }
   await sql`UPDATE wgos.outbox_events SET status='PROCESSED',processed_at=now(),attempt_count=attempt_count+1,last_error=NULL WHERE id=${event.id}::uuid AND status='PENDING'`;processed++;
  }catch(e){
   failed++;
   const error=e instanceof Error?e.message:"Workflow processing failed";
   const failedRows:any[]=await sql`UPDATE wgos.outbox_events
    SET attempt_count=attempt_count+1,last_error=${error},next_attempt_at=now()+interval '15 minutes',
        status=CASE WHEN attempt_count+1>=5 THEN 'FAILED' ELSE 'PENDING' END
    WHERE id=${event.id}::uuid
    RETURNING id,topic,payload,status,attempt_count`;
   const failedEvent=failedRows[0];
   if(failedEvent?.status==="FAILED"){
    const existing:any[]=await sql`SELECT id FROM wgos.dead_letter_events WHERE outbox_event_id=${event.id}::uuid AND resolved_at IS NULL LIMIT 1`;
    if(!existing[0]){
     await sql`INSERT INTO wgos.dead_letter_events(outbox_event_id,topic,payload,error)
      VALUES(${event.id}::uuid,${String(event.topic)},${JSON.stringify(event.payload||{})}::jsonb,${error})`;
    }
    await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload)
     VALUES(${event.brand_id},'OWNER','IN_APP','WORKFLOW_FAILED','PENDING',
      jsonb_build_object('outbox_event_id',${String(event.id)},'topic',${String(event.topic)},'error',${error}))`;
   }
  }
 }
 return {seen:events.length,processed,advanced,failed};
}
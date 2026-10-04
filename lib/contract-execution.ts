import "server-only";
import {db} from "./db";
import {createBoardTask} from "./operations-board";

export async function listContractExecution(authUserId?:string|null,isGlobal=false){
 const sql=db();
 const agreements=authUserId&&!isGlobal?await sql`SELECT a.id,a.title,a.status,a.signed_at,a.proposal_id,p.brand_id,p.opportunity_id,p.organization_id,p.one_time_total,p.deposit_amount,
  b.name brand_name,o.title opportunity_title,pr.id project_id,pr.status project_status,cc.id control_id,cc.status control_status,cc.closeout_status,cc.target_complete_at
  FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id JOIN wgos.brands b ON b.id=p.brand_id
  JOIN wgos.brand_memberships bm ON bm.brand_id=p.brand_id AND bm.auth_user_id=${authUserId} AND bm.active=true
  LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.projects pr ON pr.proposal_id=p.id
  LEFT JOIN wgos.contract_controls cc ON cc.agreement_id=a.id
  WHERE a.status='SIGNED' ORDER BY COALESCE(a.signed_at,a.created_at) DESC`
 :await sql`SELECT a.id,a.title,a.status,a.signed_at,a.proposal_id,p.brand_id,p.opportunity_id,p.organization_id,p.one_time_total,p.deposit_amount,
  b.name brand_name,o.title opportunity_title,pr.id project_id,pr.status project_status,cc.id control_id,cc.status control_status,cc.closeout_status,cc.target_complete_at
  FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id JOIN wgos.brands b ON b.id=p.brand_id
  LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id LEFT JOIN wgos.projects pr ON pr.proposal_id=p.id
  LEFT JOIN wgos.contract_controls cc ON cc.agreement_id=a.id
  WHERE a.status='SIGNED' ORDER BY COALESCE(a.signed_at,a.created_at) DESC`;
 const controlIds=agreements.map((a:any)=>a.control_id).filter(Boolean);
 if(!controlIds.length)return {agreements,controls:[],obligations:[],deliverables:[],crew:[],time:[],costs:[],changes:[],records:[],closeouts:[],crewOptions:[]};
 const [controls,obligations,deliverables,crew,time,costs,changes,records,closeouts,crewOptions]=await Promise.all([
  sql`SELECT cc.*,p.one_time_total,p.deposit_amount,
   COALESCE((SELECT sum(py.amount) FROM wgos.payments py WHERE py.proposal_id=cc.proposal_id AND py.status IN ('PAID','SUCCEEDED','COMPLETED')),0)::numeric collected,
   COALESCE((SELECT sum(c.amount_cents) FROM wgos.contract_costs c WHERE c.contract_control_id=cc.id AND c.payment_status<>'VOID'),0)::bigint committed_cost_cents,
   COALESCE((SELECT sum(c.amount_cents) FROM wgos.contract_costs c WHERE c.contract_control_id=cc.id AND c.payment_status='PAID'),0)::bigint paid_cost_cents,
   COALESCE((SELECT sum(cb.rate_cents+cb.per_diem_cents) FROM wgos.crew_bookings cb WHERE cb.contract_control_id=cc.id AND cb.booking_status NOT IN ('DECLINED','CANCELLED')),0)::bigint crew_commitment_cents,
   COALESCE((SELECT sum(te.labor_cost_cents) FROM wgos.time_entries te WHERE te.contract_control_id=cc.id AND te.status='APPROVED'),0)::bigint approved_time_cost_cents
   FROM wgos.contract_controls cc JOIN wgos.proposals p ON p.id=cc.proposal_id WHERE cc.id=ANY(${controlIds}::uuid[])`,
  sql`SELECT co.*,u.display_name owner_name FROM wgos.contract_obligations co LEFT JOIN wgos.app_users u ON u.auth_user_id=co.owner_subject WHERE co.contract_control_id=ANY(${controlIds}::uuid[]) ORDER BY co.due_at NULLS LAST,co.created_at`,
  sql`SELECT * FROM wgos.contract_deliverables WHERE contract_control_id=ANY(${controlIds}::uuid[]) ORDER BY final_due_at NULLS LAST,created_at`,
  sql`SELECT cb.*,c.first_name,c.last_name,c.email FROM wgos.crew_bookings cb LEFT JOIN wgos.contacts c ON c.id=cb.contact_id WHERE cb.contract_control_id=ANY(${controlIds}::uuid[]) ORDER BY call_at NULLS LAST,created_at`,
  sql`SELECT * FROM wgos.time_entries WHERE contract_control_id=ANY(${controlIds}::uuid[]) ORDER BY started_at DESC`,
  sql`SELECT * FROM wgos.contract_costs WHERE contract_control_id=ANY(${controlIds}::uuid[]) ORDER BY created_at DESC`,
  sql`SELECT * FROM wgos.change_orders WHERE contract_control_id=ANY(${controlIds}::uuid[]) ORDER BY created_at DESC`,
  sql`SELECT * FROM wgos.contract_records WHERE contract_control_id=ANY(${controlIds}::uuid[]) ORDER BY created_at DESC`,
  sql`SELECT * FROM wgos.contract_closeouts WHERE contract_control_id=ANY(${controlIds}::uuid[])`,
  sql`SELECT cp.id crew_profile_id,cp.brand_id,cp.day_rate_cents,cp.disciplines,c.id contact_id,c.first_name,c.last_name,c.email FROM wgos.crew_profiles cp JOIN wgos.contacts c ON c.id=cp.contact_id WHERE cp.status='ACTIVE' ORDER BY c.first_name,c.last_name`
 ]);
 return {agreements,controls,obligations,deliverables,crew,time,costs,changes,records,closeouts,crewOptions};
}

export async function initializeContractControl(input:{agreementId:string;actor:string}){
 const sql=db();
 const rows=await sql`SELECT a.id,a.status,a.proposal_id,p.brand_id,p.one_time_total,p.deposit_amount,p.opportunity_id,p.organization_id,o.owner_subject,
  pr.id project_id FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id
  LEFT JOIN wgos.projects pr ON pr.proposal_id=p.id WHERE a.id=${input.agreementId}::uuid LIMIT 1`;
 const a:any=rows[0];if(!a)throw new Error("Agreement not found.");if(a.status!=="SIGNED")throw new Error("Only signed agreements can enter Contract Control.");
 const existing=await sql`SELECT * FROM wgos.contract_controls WHERE agreement_id=${a.id}::uuid LIMIT 1`;if(existing[0])return existing[0];
 const made=await sql`INSERT INTO wgos.contract_controls(agreement_id,proposal_id,project_id,brand_id,owner_subject)
 VALUES(${a.id}::uuid,${a.proposal_id}::uuid,${a.project_id||null}::uuid,${a.brand_id},${a.owner_subject||null}) RETURNING *`;
 const cc:any=made[0];
 await sql`INSERT INTO wgos.contract_closeouts(contract_control_id) VALUES(${cc.id}::uuid) ON CONFLICT DO NOTHING`;
 const lineItems:any[]=await sql`SELECT name,description FROM wgos.proposal_line_items WHERE proposal_id=${a.proposal_id}::uuid AND selected=true ORDER BY position,id`;
 if(lineItems.length){
  for(const li of lineItems)await sql`INSERT INTO wgos.contract_obligations(contract_control_id,agreement_id,project_id,brand_id,title,description,obligation_type,responsible_party,owner_subject,priority,source_ref)
   VALUES(${cc.id}::uuid,${a.id}::uuid,${a.project_id||null}::uuid,${a.brand_id},${String(li.name)},${li.description||null},'SERVICE','US',${a.owner_subject||null},'HIGH','PROPOSAL_LINE_ITEM')`;
 }else{
  await sql`INSERT INTO wgos.contract_obligations(contract_control_id,agreement_id,project_id,brand_id,title,obligation_type,responsible_party,owner_subject,priority,source_ref)
   VALUES(${cc.id}::uuid,${a.id}::uuid,${a.project_id||null}::uuid,${a.brand_id},'Fulfill contracted scope','SERVICE','US',${a.owner_subject||null},'HIGH','SIGNED_AGREEMENT')`;
 }
 const total=Number(a.one_time_total||0),deposit=Number(a.deposit_amount||0),balance=Math.max(0,total-deposit);
 if(balance>0)await sql`INSERT INTO wgos.contract_obligations(contract_control_id,agreement_id,project_id,brand_id,title,description,obligation_type,responsible_party,priority,financial_impact_cents,source_ref)
 VALUES(${cc.id}::uuid,${a.id}::uuid,${a.project_id||null}::uuid,${a.brand_id},'Collect remaining contract balance',${"Contract balance after deposit"},'PAYMENT','CLIENT','HIGH',${Math.round(balance*100)},'PROPOSAL_FINANCIALS')`;
 await sql`INSERT INTO wgos.contract_obligations(contract_control_id,agreement_id,project_id,brand_id,title,obligation_type,responsible_party,priority,source_ref)
 VALUES(${cc.id}::uuid,${a.id}::uuid,${a.project_id||null}::uuid,${a.brand_id},'Maintain complete contract record','DOCUMENT','US','MEDIUM','SIGNED_AGREEMENT')`;
 await sql`INSERT INTO wgos.contract_records(contract_control_id,agreement_id,brand_id,record_type,title,external_ref,immutable,created_by)
 VALUES(${cc.id}::uuid,${a.id}::uuid,${a.brand_id},'AGREEMENT','Signed agreement',${String(a.id)},true,${input.actor})`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'CONTRACT_CONTROL_INITIALIZED','CONTRACT_CONTROL',${String(cc.id)},jsonb_build_object('agreementId',${String(a.id)},'projectId',${a.project_id||null}))`;
 return cc;
}

async function control(sql:any,id:string){const r=await sql`SELECT * FROM wgos.contract_controls WHERE id=${id}::uuid LIMIT 1`;if(!r[0])throw new Error("Contract control not found.");return r[0] as any;}

export async function createContractObligation(input:any){
 const sql=db(),cc=await control(sql,String(input.controlId));const title=String(input.title||"").trim();if(!title)throw new Error("Obligation title is required.");
 const rows=await sql`INSERT INTO wgos.contract_obligations(contract_control_id,agreement_id,project_id,brand_id,title,description,obligation_type,responsible_party,owner_subject,due_at,priority,source_clause,financial_impact_cents,dependency_notes)
 VALUES(${cc.id}::uuid,${cc.agreement_id}::uuid,${cc.project_id||null}::uuid,${cc.brand_id},${title},${input.description||null},${input.obligationType||"SERVICE"},${input.responsibleParty||"US"},${input.ownerSubject||null},${input.dueAt||null},${input.priority||"MEDIUM"},${input.sourceClause||null},${Math.round(Number(input.financialImpact||0)*100)},${input.dependencyNotes||null}) RETURNING *`;return rows[0];
}
export async function updateContractObligation(input:any){
 const sql=db();const status=String(input.status||"OPEN");
 const rows=await sql`UPDATE wgos.contract_obligations SET status=${status},evidence_ref=${input.evidenceRef||null},satisfied_at=CASE WHEN ${status}='SATISFIED' THEN COALESCE(satisfied_at,now()) ELSE NULL END,updated_at=now() WHERE id=${String(input.obligationId)}::uuid RETURNING *`;if(!rows[0])throw new Error("Obligation not found.");return rows[0];
}
export async function createTaskFromObligation(input:{obligationId:string;actor:string}){
 const sql=db();const r=await sql`SELECT * FROM wgos.contract_obligations WHERE id=${input.obligationId}::uuid LIMIT 1`;const o:any=r[0];if(!o)throw new Error("Obligation not found.");if(!o.project_id)throw new Error("Activate/link a project before creating an operations task.");
 if(o.task_id)return o;
 const task=await createBoardTask({projectId:String(o.project_id),title:String(o.title),description:o.description||("Contract obligation · "+o.responsible_party),groupName:"Contract Obligations",priority:o.priority||"MEDIUM",assigneeSubject:o.owner_subject||null,dueAt:o.due_at||null,requiresApproval:false,actor:input.actor});
 const rows=await sql`UPDATE wgos.contract_obligations SET task_id=${String((task as any).id)}::uuid,updated_at=now() WHERE id=${o.id}::uuid RETURNING *`;return rows[0];
}
export async function createContractDeliverable(input:any){const sql=db(),cc=await control(sql,String(input.controlId));const title=String(input.title||"").trim();if(!title)throw new Error("Deliverable title required.");const r=await sql`INSERT INTO wgos.contract_deliverables(contract_control_id,project_id,brand_id,title,owner_subject,client_input_due_at,internal_due_at,client_approval_due_at,final_due_at,acceptance_criteria,notes) VALUES(${cc.id}::uuid,${cc.project_id||null}::uuid,${cc.brand_id},${title},${input.ownerSubject||null},${input.clientInputDueAt||null},${input.internalDueAt||null},${input.clientApprovalDueAt||null},${input.finalDueAt||null},${input.acceptanceCriteria||null},${input.notes||null}) RETURNING *`;return r[0];}
export async function createCrewBooking(input:any){const sql=db(),cc=await control(sql,String(input.controlId));const role=String(input.roleName||"").trim();if(!role)throw new Error("Crew role required.");const cp=input.crewProfileId?await sql`SELECT contact_id,day_rate_cents FROM wgos.crew_profiles WHERE id=${String(input.crewProfileId)}::uuid LIMIT 1`:[];const prof:any=cp[0];const r=await sql`INSERT INTO wgos.crew_bookings(contract_control_id,project_id,brand_id,crew_profile_id,contact_id,role_name,booking_status,call_at,release_at,rehearsal_at,rate_type,rate_cents,overtime_rate_cents,travel_required,hotel_required,per_diem_cents,notes) VALUES(${cc.id}::uuid,${cc.project_id||null}::uuid,${cc.brand_id},${input.crewProfileId||null}::uuid,${prof?.contact_id||input.contactId||null}::uuid,${role},${input.bookingStatus||"PROPOSED"},${input.callAt||null},${input.releaseAt||null},${input.rehearsalAt||null},${input.rateType||"FLAT"},${Math.round(Number(input.rate||((prof?.day_rate_cents||0)/100))*100)},${Math.round(Number(input.overtimeRate||0)*100)},${Boolean(input.travelRequired)},${Boolean(input.hotelRequired)},${Math.round(Number(input.perDiem||0)*100)},${input.notes||null}) RETURNING *`;return r[0];}
export async function createTimeEntry(input:any){const sql=db(),cc=await control(sql,String(input.controlId));const start=new Date(input.startedAt),end=new Date(input.endedAt);if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new Error("Valid start/end required.");const breakMin=Math.max(0,Number(input.breakMinutes)||0),hours=Math.max(0,(end.getTime()-start.getTime())/3600000-breakMin/60),rate=Math.max(0,Number(input.hourlyRate)||0),cost=Math.round(hours*rate*100);const r=await sql`INSERT INTO wgos.time_entries(contract_control_id,project_id,brand_id,contact_id,work_type,started_at,ended_at,break_minutes,hours,hourly_rate_cents,labor_cost_cents,status,notes) VALUES(${cc.id}::uuid,${cc.project_id||null}::uuid,${cc.brand_id},${input.contactId||null}::uuid,${input.workType||"LABOR"},${input.startedAt},${input.endedAt},${breakMin},${hours},${Math.round(rate*100)},${cost},'SUBMITTED',${input.notes||null}) RETURNING *`;return r[0];}
export async function createContractCost(input:any){const sql=db(),cc=await control(sql,String(input.controlId));const desc=String(input.description||"").trim();if(!desc)throw new Error("Cost description required.");const r=await sql`INSERT INTO wgos.contract_costs(contract_control_id,project_id,brand_id,cost_type,vendor_name,description,amount_cents,committed,incurred_at,due_at,payment_status,receipt_ref,notes) VALUES(${cc.id}::uuid,${cc.project_id||null}::uuid,${cc.brand_id},${input.costType||"MISC"},${input.vendorName||null},${desc},${Math.round(Number(input.amount||0)*100)},true,${input.incurredAt||null},${input.dueAt||null},${input.paymentStatus||"UNPAID"},${input.receiptRef||null},${input.notes||null}) RETURNING *`;return r[0];}
export async function createChangeOrder(input:any){const sql=db(),cc=await control(sql,String(input.controlId));const title=String(input.title||"").trim(),description=String(input.description||"").trim();if(!title||!description)throw new Error("Change order title and description required.");const r=await sql`INSERT INTO wgos.change_orders(contract_control_id,agreement_id,project_id,brand_id,title,request_source,description,reason,schedule_impact,amount_delta_cents,status,created_by) VALUES(${cc.id}::uuid,${cc.agreement_id}::uuid,${cc.project_id||null}::uuid,${cc.brand_id},${title},${input.requestSource||"CLIENT"},${description},${input.reason||null},${input.scheduleImpact||null},${Math.round(Number(input.amountDelta||0)*100)},'DRAFT',${input.actor||null}) RETURNING *`;return r[0];}
export async function createContractRecord(input:any){const sql=db(),cc=await control(sql,String(input.controlId));const title=String(input.title||"").trim();if(!title)throw new Error("Record title required.");const r=await sql`INSERT INTO wgos.contract_records(contract_control_id,agreement_id,brand_id,record_type,title,artifact_ref,external_ref,immutable,notes,created_by) VALUES(${cc.id}::uuid,${cc.agreement_id}::uuid,${cc.brand_id},${input.recordType||"OTHER"},${title},${input.artifactRef||null},${input.externalRef||null},${Boolean(input.immutable)},${input.notes||null},${input.actor||null}) RETURNING *`;return r[0];}

export async function updateExecutionStatus(input:any){
 const sql=db(),kind=String(input.kind||""),id=String(input.id||""),status=String(input.status||"");
 if(kind==="deliverable"){const r=await sql`UPDATE wgos.contract_deliverables SET status=${status},updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Deliverable not found.");return r[0];}
 if(kind==="crew"){const r=await sql`UPDATE wgos.crew_bookings SET booking_status=${status},payment_status=CASE WHEN ${status}='COMPLETED' AND payment_status='NOT_DUE' THEN 'DUE' ELSE payment_status END,updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Crew booking not found.");return r[0];}
 if(kind==="crew-payment"){const r=await sql`UPDATE wgos.crew_bookings SET payment_status=${status},updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Crew booking not found.");return r[0];}
 if(kind==="time"){const r=await sql`UPDATE wgos.time_entries SET status=${status},approved_by=CASE WHEN ${status}='APPROVED' THEN ${input.actor||null} ELSE approved_by END,approved_at=CASE WHEN ${status}='APPROVED' THEN now() ELSE approved_at END,updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Time entry not found.");return r[0];}
 if(kind==="cost"){const r=await sql`UPDATE wgos.contract_costs SET payment_status=${status},updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Cost not found.");return r[0];}
 if(kind==="change-order"){const r=await sql`UPDATE wgos.change_orders SET status=${status},approved_at=CASE WHEN ${status}='APPROVED' THEN now() ELSE approved_at END,approval_evidence_ref=COALESCE(${input.evidenceRef||null},approval_evidence_ref),updated_at=now() WHERE id=${id}::uuid RETURNING *`;if(!r[0])throw new Error("Change order not found.");return r[0];}
 throw new Error("Unsupported execution status update.");
}
export async function updateContractCloseout(input:any){
 const sql=db(),cc=await control(sql,String(input.controlId));const fields=["finalDeliverablesComplete","finalInvoiceComplete","clientBalanceZero","personnelPaid","vendorBalancesZero","rentalsReturned","damageResolved","recordsArchived","testimonialRequested","referralRequested","satisfactionRecorded","lessonsRecorded","renewalOpportunityReviewed"];
 const v:any={};for(const k of fields)v[k]=Boolean(input[k]);
 const done=fields.every(k=>v[k]);
 const r=await sql`INSERT INTO wgos.contract_closeouts(contract_control_id,final_deliverables_complete,final_invoice_complete,client_balance_zero,personnel_paid,vendor_balances_zero,rentals_returned,damage_resolved,records_archived,testimonial_requested,referral_requested,satisfaction_recorded,lessons_recorded,renewal_opportunity_reviewed,notes,closed_by,closed_at)
 VALUES(${cc.id}::uuid,${v.finalDeliverablesComplete},${v.finalInvoiceComplete},${v.clientBalanceZero},${v.personnelPaid},${v.vendorBalancesZero},${v.rentalsReturned},${v.damageResolved},${v.recordsArchived},${v.testimonialRequested},${v.referralRequested},${v.satisfactionRecorded},${v.lessonsRecorded},${v.renewalOpportunityReviewed},${input.notes||null},${done?input.actor:null},${done?new Date().toISOString():null}::timestamptz)
 ON CONFLICT(contract_control_id) DO UPDATE SET final_deliverables_complete=excluded.final_deliverables_complete,final_invoice_complete=excluded.final_invoice_complete,client_balance_zero=excluded.client_balance_zero,personnel_paid=excluded.personnel_paid,vendor_balances_zero=excluded.vendor_balances_zero,rentals_returned=excluded.rentals_returned,damage_resolved=excluded.damage_resolved,records_archived=excluded.records_archived,testimonial_requested=excluded.testimonial_requested,referral_requested=excluded.referral_requested,satisfaction_recorded=excluded.satisfaction_recorded,lessons_recorded=excluded.lessons_recorded,renewal_opportunity_reviewed=excluded.renewal_opportunity_reviewed,notes=excluded.notes,closed_by=excluded.closed_by,closed_at=excluded.closed_at,updated_at=now() RETURNING *`;
 await sql`UPDATE wgos.contract_controls SET closeout_status=${done?"CLOSED":"OPEN"},status=CASE WHEN ${done} THEN 'COMPLETE' ELSE status END,completed_at=CASE WHEN ${done} THEN COALESCE(completed_at,now()) ELSE completed_at END,updated_at=now() WHERE id=${cc.id}::uuid`;
 return r[0];
}

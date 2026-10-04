import "server-only";import {db} from "./db";import {assertProposalCountermeasureReady,saveProposalCountermeasure} from "./proposal-countermeasure";
export async function getBrandExperience(brandId:string){const sql=db();const r=await sql`SELECT b.id,b.name,x.* FROM wgos.brands b LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id WHERE b.id=${brandId} LIMIT 1`;return r[0]??null}
export async function createProposalDraft(input:{opportunityId:string;actor:string;expiresAt?:string|null}){
 const sql=db();const os=await sql`SELECT * FROM wgos.opportunities WHERE id=${input.opportunityId}::uuid LIMIT 1`;const o:any=os[0];if(!o)throw new Error("Opportunity not found.");
 const versions=await sql`SELECT COALESCE(max(version),0)::int n FROM wgos.proposals WHERE opportunity_id=${o.id}::uuid`;const version=Number((versions[0] as any)?.n||0)+1;
 const content={expiresAt:input.expiresAt||null};
 const rows=await sql`INSERT INTO wgos.proposals(opportunity_id,brand_id,organization_id,version,status,currency,one_time_total,content) VALUES(${o.id}::uuid,${o.brand_id},${o.organization_id||null}::uuid,${version},'DRAFT','USD',${Number(o.estimated_value||0)},${JSON.stringify(content)}::jsonb) RETURNING *`;
 const p:any=rows[0];const canonicalPath="/proposal/"+p.id;await sql`UPDATE wgos.proposals SET content=COALESCE(content,'{}'::jsonb)||jsonb_build_object('publicPath',${canonicalPath}) WHERE id=${p.id}::uuid`;p.content={...(p.content||{}),publicPath:canonicalPath};await sql`UPDATE wgos.opportunities SET proposal_id=${p.id}::uuid,stage='PROPOSAL',updated_at=now() WHERE id=${o.id}::uuid`;
 await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'PROPOSAL_DRAFT_CREATED','proposal',${String(p.id)},${JSON.stringify({opportunityId:o.id,version})}::jsonb)`;return p;
}
export async function proposalPublicUrl(proposalId:string){const sql=db();const rows=await sql`SELECT p.id,p.status,p.content,b.name,x.public_domain,x.proposal_path_prefix FROM wgos.proposals p JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id WHERE p.id=${proposalId}::uuid LIMIT 1`;const r:any=rows[0];if(!r)return null;const path=String((r.proposal_path_prefix||"/proposal")+"/"+r.id);if(!r.public_domain)return {brand:r.name,path,url:null};return {brand:r.name,path,url:"https://"+r.public_domain+path};}
export async function listProposals(){const sql=db();return sql`SELECT p.*,o.title opportunity_title,b.name brand_name,org.name organization_name FROM wgos.proposals p LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.organizations org ON org.id=p.organization_id ORDER BY p.updated_at DESC`;}
export async function updateProposalFinancials(input:{proposalId:string;oneTimeTotal:number;depositAmount:number;actor:string}){const sql=db();const rows=await sql`UPDATE wgos.proposals SET one_time_total=${Math.max(0,input.oneTimeTotal)},deposit_amount=${Math.max(0,input.depositAmount)},updated_at=now() WHERE id=${input.proposalId}::uuid AND status='DRAFT' RETURNING *`;const p:any=rows[0];if(!p)throw new Error("Editable proposal not found.");await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'PROPOSAL_PRICING_UPDATED','proposal',${String(p.id)},${JSON.stringify({oneTimeTotal:input.oneTimeTotal,depositAmount:input.depositAmount})}::jsonb)`;return p;}
export async function approveProposal(input:{proposalId:string;actor:string}){await assertProposalCountermeasureReady(input.proposalId);const sql=db();const rows=await sql`UPDATE wgos.proposals SET status='APPROVED',approved_by_subject=${input.actor},approved_at=now(),updated_at=now() WHERE id=${input.proposalId}::uuid AND status='DRAFT' RETURNING *`;const p:any=rows[0];if(!p)throw new Error("Draft proposal not found.");await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${input.actor},'PROPOSAL_APPROVED','proposal',${String(p.id)},'{}'::jsonb)`;return p;}

export async function clientExperienceReadiness(){const sql=db();return sql`
 SELECT b.id,b.name,x.public_domain,x.sender_name,x.sender_email,x.reply_to_email,x.proposal_path_prefix,x.contract_path_prefix,x.portal_path_prefix,x.payment_path_prefix,
 (CASE WHEN NULLIF(trim(COALESCE(x.public_domain,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.sender_name,'')),'') IS NOT NULL AND NULLIF(trim(COALESCE(x.sender_email,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.proposal_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.contract_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.portal_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END+
  CASE WHEN NULLIF(trim(COALESCE(x.payment_path_prefix,'')),'') IS NOT NULL THEN 1 ELSE 0 END)::int readiness_points
 FROM wgos.brands b LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=b.id ORDER BY b.name`;}

export async function clientJourneyLinks(proposalIds:string[]){const sql=db();if(!proposalIds.length)return [];return sql`SELECT p.id proposal_id,p.status proposal_status,b.name brand_name,x.public_domain,x.proposal_path_prefix,x.contract_path_prefix,x.portal_path_prefix,x.payment_path_prefix,a.id agreement_id,a.status agreement_status,pr.id project_id,pr.status project_status FROM wgos.proposals p JOIN wgos.brands b ON b.id=p.brand_id LEFT JOIN wgos.brand_experience_profiles x ON x.brand_id=p.brand_id LEFT JOIN LATERAL(SELECT id,status FROM wgos.agreements aa WHERE aa.proposal_id=p.id ORDER BY aa.created_at DESC LIMIT 1)a ON true LEFT JOIN LATERAL(SELECT id,status FROM wgos.projects pp WHERE pp.proposal_id=p.id ORDER BY pp.created_at DESC LIMIT 1)pr ON true WHERE p.id=ANY(${proposalIds}::uuid[])`;}


function textValue(v:any){return String(v??"").trim();}
function compactLines(parts:Array<string|null|undefined>){return parts.map(x=>textValue(x)).filter(Boolean).join("\n\n");}

export async function ensureReadyDiscoveryProposalDrafts(input:{limit?:number}={}){
 const sql=db();const limit=Math.max(1,Math.min(Number(input.limit||20),50));
 const rows:any[]=await sql`
  SELECT o.*,b.name brand_name,org.name organization_name
  FROM wgos.opportunities o
  JOIN wgos.brands b ON b.id=o.brand_id
  LEFT JOIN wgos.organizations org ON org.id=o.organization_id
  WHERE b.name='Studio2016'
   AND o.source='PUBLIC_WEB_INQUIRY'
   AND o.proposal_id IS NULL
   AND COALESCE(o.discovery->'_discovery'->>'status','')='READY_FOR_PROPOSAL'
  ORDER BY o.updated_at ASC
  LIMIT ${limit}`;
 let created=0,skipped=0,failed=0;const errors:string[]=[];
 for(const o of rows){try{
  const p:any=await createProposalDraft({opportunityId:String(o.id),actor:"system:proposal-readiness"});
  const d:any=o.discovery||{},a:any=d.answers||{};
  const objective=textValue(a.successCriteria)||"Deliver a production approach aligned with the client's stated outcome and operating requirements.";
  const scope=textValue(a.scopeDetails)||textValue(d.disciplines)||"Studio2016 will define the recommended production scope from the approved discovery record.";
  const schedule=compactLines([
    textValue(d.timeline)?`Project timing: ${textValue(d.timeline)}`:null,
    textValue(a.scheduleConstraints)?`Critical schedule details: ${textValue(a.scheduleConstraints)}`:null
  ]);
  const environment=compactLines([
    textValue(d.venue)?`Venue / environment: ${textValue(d.venue)}`:null,
    textValue(d.scale)?`Scale: ${textValue(d.scale)}`:null,
    textValue(a.existingSystems)?`Existing systems/resources: ${textValue(a.existingSystems)}`:null,
    textValue(a.venueConstraints)?`Known constraints: ${textValue(a.venueConstraints)}`:null
  ]);
  const media=textValue(a.broadcastRecording);
  const decision=compactLines([
    textValue(a.decisionAuthority)?`Approval authority: ${textValue(a.decisionAuthority)}`:null,
    textValue(a.decisionProcess)?`Decision process: ${textValue(a.decisionProcess)}`:null
  ]);
  const budget=textValue(a.budgetConversation)||textValue(d.budget);
  const docs=textValue(a.technicalDocs);
  const assumptions=compactLines([
    "This draft recommendation is based on the information supplied during intake and discovery.",
    "Final equipment quantities, labor, logistics, venue-specific engineering, taxes, travel, permits, and third-party costs remain subject to final technical and commercial review unless explicitly included.",
    environment||null,
    docs?`Supporting material supplied by the client: ${docs}`:null
  ]);
  const recommendation=compactLines([
    `Studio2016 should proceed from discovery into a defined production recommendation centered on this success criterion: ${objective}`,
    `Recommended responsibility: ${scope}`,
    schedule||null,
    media?`Media / broadcast requirement: ${media}`:null,
    "The commercial proposal should preserve outcome clarity, explicitly state assumptions, and avoid committing undefined technical quantities before final review."
  ]);
  const sections=[
    {position:10,type:"EXECUTIVE_SUMMARY",title:"The Outcome We Are Designing For",content:objective},
    {position:20,type:"RECOMMENDED_SCOPE",title:"Recommended Studio2016 Responsibility",content:scope},
    {position:30,type:"PROJECT_CONTEXT",title:"Project Context",content:compactLines([schedule,environment,media?`Media / broadcast: ${media}`:null])||"Project context captured in the discovery record."},
    {position:40,type:"DECISION_PATH",title:"Decision & Approval Path",content:decision||"Final approval path to be confirmed during owner review."},
    {position:50,type:"ASSUMPTIONS",title:"Assumptions & Boundaries",content:assumptions},
    {position:60,type:"NEXT_STEP",title:"Next Step",content:"Studio2016 owner review will finalize the recommended scope, investment, deposit, exclusions, and any site-visit or engineering requirements before client release."}
  ];
  for(const s of sections)await sql`INSERT INTO wgos.proposal_sections(proposal_id,position,section_type,title,content) VALUES(${String(p.id)}::uuid,${s.position},${s.type},${s.title},${JSON.stringify(s.content)}::jsonb)`;
  await saveProposalCountermeasure({
    proposalId:String(p.id),actor:"system:proposal-readiness",
    buyerCase:decision||"Client approval authority and decision path are captured in discovery; owner should confirm any ambiguity before release.",
    financeCase:budget?`Budget context captured: ${budget}`:"Investment is not yet client-authorized; owner pricing review is required before proposal approval.",
    technicalCase:compactLines([scope,environment,media])||"Technical scope derives from discovery and requires owner validation before release.",
    procurementCase:"Confirm venue-provided resources, third-party rentals, labor requirements, lead times, and any externally procured services before release.",
    competitiveCase:"Position Studio2016 around integrated systems thinking, accountable production ownership, operational clarity, and reduced client coordination burden.",
    implementationCase:compactLines([schedule,"Validate labor, logistics, equipment, access, power, rigging, rehearsal, show, and strike requirements before release."]),
    inactionCase:"Unresolved production assumptions increase the risk of late scope changes, avoidable cost, technical compromise, and execution friction.",
    scopeRisks:"Do not convert discovery assumptions into guaranteed deliverables until equipment, labor, venue conditions, and responsibility boundaries are validated.",
    pricingRisks:"Do not release $0, placeholder, or unvalidated pricing. Confirm margin, labor, equipment, logistics, third-party costs, taxes, travel, contingency, and deposit requirements.",
    legalRisks:"Use the approved Studio2016 agreement terms and ensure proposal scope does not contradict contractual exclusions, safety requirements, cancellation terms, or client responsibilities.",
    assumptions,
    missingInformation:"Owner must finalize investment, deposit, exclusions, any technical quantities, and whether a site visit or engineering review is required.",
    mitigationPlan:"Owner reviews discovery, validates technical assumptions, prices the engagement, resolves material unknowns, then explicitly approves the proposal before client access can be issued.",
    recommendation
  });
  await sql`INSERT INTO wgos.notification_events(brand_id,recipient_subject,channel,event_type,status,payload) VALUES(${o.brand_id},'OWNER','IN_APP','PROPOSAL_DRAFT_READY','PENDING',${JSON.stringify({opportunity_id:String(o.id),proposal_id:String(p.id),discovery_readiness:Number(d?._discovery?.readiness||0)})}::jsonb)`;
  created++;
 }catch(e){failed++;errors.push(e instanceof Error?e.message:"Unable to prepare proposal draft");}}
 return {seen:rows.length,created,skipped,failed,errors};
}

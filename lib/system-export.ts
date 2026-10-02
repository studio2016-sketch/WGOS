import "server-only";
import {db} from "./db";

export async function buildSystemExport(){
 const sql=db();
 const [
  brands,brandMemberships,brandExperienceProfiles,brandPaymentProfiles,integrations,
  appUsers,organizations,contacts,opportunities,proposals,acceptedSnapshots,agreementTerms,agreements,
  signatureEnvelopes,projects,tasks,taskDependencies,payments,invoices,communicationThreads,communicationMessages,
  equipmentAssets,crewProfiles,projectCrewAssignments,projectEquipmentAssignments,approvalRequests,documentVersions,
  productionEvents,productionDepartments,productionRequirements,runOfShowItems,advancingCheckpoints,
  auditEvents,outboxEvents,notificationEvents
 ]=await Promise.all([
  sql`SELECT * FROM wgos.brands ORDER BY id`,
  sql`SELECT * FROM wgos.brand_memberships ORDER BY brand_id,auth_user_id`,
  sql`SELECT * FROM wgos.brand_experience_profiles ORDER BY brand_id`,
  sql`SELECT * FROM wgos.brand_payment_profiles ORDER BY brand_id`,
  sql`SELECT id,brand_id,provider,capability,status,last_verified_at,last_error,metadata,created_at,updated_at FROM wgos.integration_registry ORDER BY provider,capability,brand_id NULLS FIRST`,
  sql`SELECT auth_user_id,email,display_name,role,active,created_at,updated_at FROM wgos.app_users ORDER BY email`,
  sql`SELECT * FROM wgos.organizations ORDER BY created_at`,
  sql`SELECT * FROM wgos.contacts ORDER BY created_at`,
  sql`SELECT * FROM wgos.opportunities ORDER BY created_at`,
  sql`SELECT * FROM wgos.proposals ORDER BY created_at`,
  sql`SELECT * FROM wgos.accepted_snapshots ORDER BY accepted_at`,
  sql`SELECT * FROM wgos.agreement_terms ORDER BY created_at`,
  sql`SELECT * FROM wgos.agreements ORDER BY created_at`,
  sql`SELECT * FROM wgos.signature_envelopes ORDER BY created_at`,
  sql`SELECT * FROM wgos.projects ORDER BY created_at`,
  sql`SELECT * FROM wgos.tasks ORDER BY created_at`,
  sql`SELECT * FROM wgos.task_dependencies ORDER BY task_id,depends_on_task_id`,
  sql`SELECT * FROM wgos.payments ORDER BY paid_at NULLS LAST`,
  sql`SELECT * FROM wgos.invoices ORDER BY created_at`,
  sql`SELECT * FROM wgos.communication_threads ORDER BY created_at`,
  sql`SELECT * FROM wgos.communication_messages ORDER BY created_at`,
  sql`SELECT * FROM wgos.equipment_assets ORDER BY created_at`,
  sql`SELECT * FROM wgos.crew_profiles ORDER BY created_at`,
  sql`SELECT * FROM wgos.project_crew_assignments ORDER BY created_at`,
  sql`SELECT * FROM wgos.project_equipment_assignments ORDER BY created_at`,
  sql`SELECT * FROM wgos.approval_requests ORDER BY requested_at`,
  sql`SELECT * FROM wgos.document_versions ORDER BY created_at`,
  sql`SELECT * FROM wgos.production_events ORDER BY created_at`,
  sql`SELECT * FROM wgos.production_departments ORDER BY created_at`,
  sql`SELECT * FROM wgos.production_requirements ORDER BY created_at`,
  sql`SELECT * FROM wgos.run_of_show_items ORDER BY created_at`,
  sql`SELECT * FROM wgos.advancing_checkpoints ORDER BY created_at`,
  sql`SELECT * FROM wgos.audit_events ORDER BY created_at`,
  sql`SELECT * FROM wgos.outbox_events ORDER BY created_at`,
  sql`SELECT * FROM wgos.notification_events ORDER BY created_at`
 ]);
 return {format:"WGOS_SYSTEM_EXPORT",version:1,exportedAt:new Date().toISOString(),data:{
  brands,brandMemberships,brandExperienceProfiles,brandPaymentProfiles,integrations,appUsers,organizations,contacts,
  opportunities,proposals,acceptedSnapshots,agreementTerms,agreements,signatureEnvelopes,projects,tasks,taskDependencies,
  payments,invoices,communicationThreads,communicationMessages,equipmentAssets,crewProfiles,projectCrewAssignments,
  projectEquipmentAssignments,approvalRequests,documentVersions,productionEvents,productionDepartments,
  productionRequirements,runOfShowItems,advancingCheckpoints,auditEvents,outboxEvents,notificationEvents
 }};
}
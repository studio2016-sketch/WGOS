import "server-only";
import {db} from "./db";

async function audit(actor:string,action:string,entityType:string,entityId:string,metadata:any={}){const sql=db();await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata) VALUES(${actor},${action},${entityType},${entityId},${JSON.stringify(metadata)}::jsonb)`;}

export async function relationshipReferenceData(){
 const sql=db();
 const [brands,organizations,contacts]=await Promise.all([
  sql`SELECT id,name FROM wgos.brands ORDER BY name`,
  sql`SELECT o.*,array_remove(array_agg(ob.brand_id),NULL) brand_ids FROM wgos.organizations o LEFT JOIN wgos.organization_brands ob ON ob.organization_id=o.id GROUP BY o.id ORDER BY o.name`,
  sql`SELECT c.*,o.name organization_name,array_remove(array_agg(cb.brand_id),NULL) brand_ids FROM wgos.contacts c LEFT JOIN wgos.organizations o ON o.id=c.organization_id LEFT JOIN wgos.contact_brands cb ON cb.contact_id=c.id GROUP BY c.id,o.name ORDER BY c.last_name,c.first_name`
 ]);
 const [opportunityLinks,proposalLinks,projectLinks,threadLinks,agreementLinks,paymentLinks]=await Promise.all([sql`SELECT id,organization_id,primary_contact_id,brand_id,title,stage,estimated_value,created_at,updated_at FROM wgos.opportunities ORDER BY updated_at DESC`,sql`SELECT p.id,p.organization_id,p.brand_id,p.status,p.version,p.created_at,p.updated_at,p.approved_at,p.sent_at,o.primary_contact_id,o.title opportunity_title FROM wgos.proposals p LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id ORDER BY p.updated_at DESC`,sql`SELECT p.id,p.organization_id,p.brand_id,p.status,p.title,p.created_at,p.updated_at,o.primary_contact_id FROM wgos.projects p LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id ORDER BY p.updated_at DESC`,sql`SELECT t.id,t.organization_id,t.contact_id,t.brand_id,t.status,t.subject,t.updated_at,m.direction recent_direction,m.occurred_at recent_at FROM wgos.communication_threads t LEFT JOIN LATERAL(SELECT direction,occurred_at FROM wgos.communication_messages x WHERE x.thread_id=t.id ORDER BY occurred_at DESC LIMIT 1)m ON true ORDER BY t.updated_at DESC`,sql`SELECT a.id,a.status,a.updated_at,p.organization_id,p.brand_id,o.primary_contact_id,o.title opportunity_title FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id ORDER BY a.updated_at DESC`,sql`SELECT py.id,py.status,py.amount,py.currency,py.paid_at,py.created_at,p.organization_id,p.brand_id,o.primary_contact_id,o.title opportunity_title FROM wgos.payments py JOIN wgos.proposals p ON p.id=py.proposal_id LEFT JOIN wgos.opportunities o ON o.id=p.opportunity_id ORDER BY COALESCE(py.paid_at,py.created_at) DESC`]);
 return {brands,organizations,contacts,opportunityLinks,proposalLinks,projectLinks,threadLinks,agreementLinks,paymentLinks};
}
export async function createOrganization(input:{name:string;type?:string;website?:string|null;notes?:string|null;brandIds:string[];actor:string}){
 const name=input.name.trim();if(!name)throw new Error("Organization name is required.");if(!input.brandIds.length)throw new Error("Select at least one brand.");
 const sql=db();const rows=await sql`INSERT INTO wgos.organizations(name,type,website,notes) VALUES(${name},${input.type||"CLIENT"},${input.website||null},${input.notes||null}) RETURNING *`;const o:any=rows[0];
 for(const brandId of input.brandIds)await sql`INSERT INTO wgos.organization_brands(organization_id,brand_id) VALUES(${o.id}::uuid,${brandId}) ON CONFLICT DO NOTHING`;
 await audit(input.actor,"ORGANIZATION_CREATED","organization",String(o.id),{name,brandIds:input.brandIds});return o;
}
export async function createContact(input:{firstName:string;lastName:string;email?:string|null;phone?:string|null;role?:string|null;organizationId?:string|null;brandIds:string[];actor:string}){
 const first=input.firstName.trim(),last=input.lastName.trim();if(!first||!last)throw new Error("First and last name are required.");if(!input.brandIds.length)throw new Error("Select at least one brand.");
 const sql=db();const rows=await sql`INSERT INTO wgos.contacts(organization_id,first_name,last_name,email,phone,role) VALUES(${input.organizationId||null}::uuid,${first},${last},${input.email||null},${input.phone||null},${input.role||null}) RETURNING *`;const c:any=rows[0];
 for(const brandId of input.brandIds)await sql`INSERT INTO wgos.contact_brands(contact_id,brand_id) VALUES(${c.id}::uuid,${brandId}) ON CONFLICT DO NOTHING`;
 await audit(input.actor,"CONTACT_CREATED","contact",String(c.id),{name:first+" "+last,brandIds:input.brandIds});return c;
}
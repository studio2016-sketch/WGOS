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
 return {brands,organizations,contacts};
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
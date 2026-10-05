import "server-only";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {db} from "./db";

const AUTH_BASE_URL=process.env.NEON_AUTH_BASE_URL;
export function authConfigured(){return Boolean(AUTH_BASE_URL&&process.env.DATABASE_URL)}
async function neonSession(){if(!AUTH_BASE_URL)return null;const incoming=await headers();const h=new Headers();for(const k of ["cookie","user-agent","x-forwarded-for"]){const v=incoming.get(k);if(v)h.set(k,v)}try{const r=await fetch(AUTH_BASE_URL.replace(/\/$/,"")+"/get-session",{headers:h,cache:"no-store"});return r.ok?await r.json():null}catch{return null}}
export async function currentIdentity(){
 if(!authConfigured())return null;
 const session:any=await neonSession();
 const authUserId=session?.user?.id;
 const sessionEmail=String(session?.user?.email||"").trim().toLowerCase();
 if(!authUserId)return null;
 try{
  const sql=db();
  let rows:any[]=await sql`SELECT auth_user_id,email,display_name,role,active FROM wgos.app_users WHERE auth_user_id=${String(authUserId)} AND active=true LIMIT 1`;
  if(rows[0])return rows[0];
  if(!sessionEmail)return null;
  const invites:any[]=await sql`SELECT * FROM wgos.user_access_invites WHERE lower(email)=${sessionEmail} AND status='PENDING' ORDER BY created_at DESC LIMIT 1`;
  const invite=invites[0];
  if(!invite)return null;
  const made:any[]=await sql`
   INSERT INTO wgos.app_users(auth_user_id,email,display_name,role,active)
   VALUES(${String(authUserId)},${sessionEmail},${String(invite.display_name)},${String(invite.app_role)},true)
   ON CONFLICT(auth_user_id) DO UPDATE SET email=EXCLUDED.email,display_name=EXCLUDED.display_name,role=EXCLUDED.role,active=true
   RETURNING auth_user_id,email,display_name,role,active`;
  const brandNames=Array.isArray(invite.brand_names)?invite.brand_names.map(String):[];
  if(brandNames.length){
   const brands:any[]=await sql`SELECT id,name FROM wgos.brands WHERE name=ANY(${brandNames}::text[])`;
   for(const brand of brands){
    await sql`
     INSERT INTO wgos.brand_memberships(auth_user_id,brand_id,membership_role,active,granted_by)
     VALUES(${String(authUserId)},${String(brand.id)},${String(invite.membership_role)},true,NULL)
     ON CONFLICT(auth_user_id,brand_id) DO UPDATE
      SET membership_role=EXCLUDED.membership_role,active=true,revoked_at=NULL`;
   }
   if(brands.length!==brandNames.length)throw new Error("INVITE_BRAND_SCOPE_INCOMPLETE");
  }
  await sql`UPDATE wgos.user_access_invites SET status='CLAIMED',claimed_at=now(),claimed_auth_user_id=${String(authUserId)} WHERE id=${String(invite.id)}::uuid AND status='PENDING'`;
  await sql`INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
   VALUES(${String(authUserId)},'SCOPED_USER_ACCESS_CLAIMED','app_user',${String(authUserId)},
    jsonb_build_object('email',${sessionEmail}::text,'brands',${JSON.stringify(brandNames)}::jsonb,'role',${String(invite.app_role)}::text))`;
  return made[0]??null;
 }catch(e){
  console.error("WGOS_IDENTITY_RESOLUTION_ERROR",e);
  return null;
 }
}
export async function requireAdmin(){const identity=await currentIdentity();if(!identity||!["OWNER","ADMIN"].includes(String(identity.role)))redirect("/login");return identity}
export async function requireApiAdmin(){const identity=await currentIdentity();if(!identity)return {ok:false as const,status:401,error:"AUTHENTICATION_REQUIRED"};if(!["OWNER","ADMIN"].includes(String(identity.role)))return {ok:false as const,status:403,error:"ADMIN_REQUIRED"};return {ok:true as const,identity}}
export async function requireUser(){const identity=await currentIdentity();if(!identity)redirect("/login");return identity}
export async function requireApiUser(){const identity=await currentIdentity();if(!identity)return {ok:false as const,status:401,error:"AUTHENTICATION_REQUIRED"};return {ok:true as const,identity}}
export async function commandAccess(){
 const identity=await currentIdentity();
 if(!identity)redirect("/login");
 const isGlobal=["OWNER","ADMIN"].includes(String(identity.role));
 if(isGlobal)return {identity,isGlobal:true,brandIds:null as string[]|null};
 const sql=db();
 const rows=await sql`SELECT brand_id FROM wgos.brand_memberships WHERE auth_user_id=${String(identity.auth_user_id)} AND active=true ORDER BY brand_id`;
 const brandIds=rows.map((row:any)=>String(row.brand_id));
 if(!brandIds.length)redirect("/work");
 return {identity,isGlobal:false,brandIds};
}

export async function canAccessBrand(identity:any,brandId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return true;
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.brand_memberships WHERE auth_user_id=${String(identity.auth_user_id)} AND brand_id=${brandId} AND active=true LIMIT 1`;return Boolean(rows[0]);
}
export async function brandMembershipRole(identity:any,brandId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return "BRAND_ADMIN";
 const sql=db();const rows=await sql`SELECT membership_role FROM wgos.brand_memberships WHERE auth_user_id=${String(identity?.auth_user_id||"")} AND brand_id=${brandId} AND active=true LIMIT 1`;
 return rows[0]?.membership_role?String(rows[0].membership_role):null;
}
export async function canManageBrand(identity:any,brandId:string){
 const role=await brandMembershipRole(identity,brandId);
 return role==="BRAND_ADMIN"||role==="MANAGER";
}
export async function requireApiBrand(identity:any,brandId:string){
 return await canAccessBrand(identity,brandId)?{ok:true as const}:{ok:false as const,status:403,error:"BRAND_ACCESS_REQUIRED"};
}
export async function requireApiBrandAdmin(identity:any,brandId:string){
 return await canManageBrand(identity,brandId)?{ok:true as const}:{ok:false as const,status:403,error:"BRAND_ADMIN_REQUIRED"};
}
export async function requireApiBrandsAdmin(identity:any,brandIds:string[]){
 const unique=[...new Set(brandIds.map(String).filter(Boolean))];
 if(!unique.length)return {ok:false as const,status:400,error:"BRAND_REQUIRED"};
 for(const brandId of unique)if(!await canManageBrand(identity,brandId))return {ok:false as const,status:403,error:"BRAND_ADMIN_REQUIRED"};
 return {ok:true as const};
}
export async function requireApiProject(identity:any,projectId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.projects p JOIN wgos.brand_memberships m ON m.brand_id=p.brand_id AND m.auth_user_id=${String(identity.auth_user_id)} AND m.active=true WHERE p.id=${projectId}::uuid LIMIT 1`;return rows[0]?{ok:true as const}:{ok:false as const,status:403,error:"PROJECT_ACCESS_REQUIRED"};
}
export async function requireApiTask(identity:any,taskId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.tasks t JOIN wgos.projects p ON p.id=t.project_id JOIN wgos.brand_memberships m ON m.brand_id=p.brand_id AND m.auth_user_id=${String(identity.auth_user_id)} AND m.active=true WHERE t.id=${taskId}::uuid LIMIT 1`;return rows[0]?{ok:true as const}:{ok:false as const,status:403,error:"TASK_ACCESS_REQUIRED"};
}
export async function requireApiOpportunity(identity:any,opportunityId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT brand_id FROM wgos.opportunities WHERE id=${opportunityId}::uuid LIMIT 1`;
 return rows[0]&&await canManageBrand(identity,String(rows[0].brand_id))?{ok:true as const}:{ok:false as const,status:403,error:"OPPORTUNITY_ACCESS_REQUIRED"};
}

export async function requireApiProposal(identity:any,proposalId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT brand_id FROM wgos.proposals WHERE id=${proposalId}::uuid LIMIT 1`;
 return rows[0]&&await canManageBrand(identity,String(rows[0].brand_id))?{ok:true as const}:{ok:false as const,status:403,error:"PROPOSAL_ACCESS_REQUIRED"};
}

export async function requireApiAgreement(identity:any,agreementId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT p.brand_id FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id WHERE a.id=${agreementId}::uuid LIMIT 1`;
 return rows[0]&&await canManageBrand(identity,String(rows[0].brand_id))?{ok:true as const}:{ok:false as const,status:403,error:"AGREEMENT_ACCESS_REQUIRED"};
}

export async function requireApiCommunicationThread(identity:any,threadId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT brand_id FROM wgos.communication_threads WHERE id=${threadId}::uuid LIMIT 1`;
 return rows[0]&&await canManageBrand(identity,String(rows[0].brand_id))?{ok:true as const}:{ok:false as const,status:403,error:"COMMUNICATION_ACCESS_REQUIRED"};
}

export async function requireApiEquipment(identity:any,assetId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT brand_id FROM wgos.equipment_assets WHERE id=${assetId}::uuid LIMIT 1`;
 return rows[0]&&await canManageBrand(identity,String(rows[0].brand_id))?{ok:true as const}:{ok:false as const,status:403,error:"EQUIPMENT_ACCESS_REQUIRED"};
}

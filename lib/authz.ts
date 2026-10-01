import "server-only";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {db} from "./db";

const AUTH_BASE_URL=process.env.NEON_AUTH_BASE_URL;
export function authConfigured(){return Boolean(AUTH_BASE_URL&&process.env.DATABASE_URL)}
async function neonSession(){if(!AUTH_BASE_URL)return null;const incoming=await headers();const h=new Headers();for(const k of ["cookie","user-agent","x-forwarded-for"]){const v=incoming.get(k);if(v)h.set(k,v)}try{const r=await fetch(AUTH_BASE_URL.replace(/\/$/,"")+"/get-session",{headers:h,cache:"no-store"});return r.ok?await r.json():null}catch{return null}}
export async function currentIdentity(){if(!authConfigured())return null;const session:any=await neonSession();const authUserId=session?.user?.id;if(!authUserId)return null;try{const sql=db();const rows=await sql`SELECT auth_user_id,email,display_name,role,active FROM wgos.app_users WHERE auth_user_id=${String(authUserId)} AND active=true LIMIT 1`;return rows[0]??null}catch{return null}}
export async function requireAdmin(){const identity=await currentIdentity();if(!identity||!["OWNER","ADMIN"].includes(String(identity.role)))redirect("/login");return identity}
export async function requireApiAdmin(){const identity=await currentIdentity();if(!identity)return {ok:false as const,status:401,error:"AUTHENTICATION_REQUIRED"};if(!["OWNER","ADMIN"].includes(String(identity.role)))return {ok:false as const,status:403,error:"ADMIN_REQUIRED"};return {ok:true as const,identity}}
export async function requireUser(){const identity=await currentIdentity();if(!identity)redirect("/login");return identity}
export async function requireApiUser(){const identity=await currentIdentity();if(!identity)return {ok:false as const,status:401,error:"AUTHENTICATION_REQUIRED"};return {ok:true as const,identity}}

export async function canAccessBrand(identity:any,brandId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return true;
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.brand_memberships WHERE auth_user_id=${String(identity.auth_user_id)} AND brand_id=${brandId} AND active=true LIMIT 1`;return Boolean(rows[0]);
}
export async function requireApiBrand(identity:any,brandId:string){
 return await canAccessBrand(identity,brandId)?{ok:true as const}:{ok:false as const,status:403,error:"BRAND_ACCESS_REQUIRED"};
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
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.opportunities o JOIN wgos.brand_memberships m ON m.brand_id=o.brand_id AND m.auth_user_id=${String(identity.auth_user_id)} AND m.active=true WHERE o.id=${opportunityId}::uuid LIMIT 1`;return rows[0]?{ok:true as const}:{ok:false as const,status:403,error:"OPPORTUNITY_ACCESS_REQUIRED"};
}

export async function requireApiProposal(identity:any,proposalId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.proposals p JOIN wgos.brand_memberships m ON m.brand_id=p.brand_id AND m.auth_user_id=${String(identity.auth_user_id)} AND m.active=true WHERE p.id=${proposalId}::uuid LIMIT 1`;return rows[0]?{ok:true as const}:{ok:false as const,status:403,error:"PROPOSAL_ACCESS_REQUIRED"};
}

export async function requireApiAgreement(identity:any,agreementId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.agreements a JOIN wgos.proposals p ON p.id=a.proposal_id JOIN wgos.brand_memberships m ON m.brand_id=p.brand_id AND m.auth_user_id=${String(identity.auth_user_id)} AND m.active=true WHERE a.id=${agreementId}::uuid LIMIT 1`;return rows[0]?{ok:true as const}:{ok:false as const,status:403,error:"AGREEMENT_ACCESS_REQUIRED"};
}

export async function requireApiCommunicationThread(identity:any,threadId:string){
 if(["OWNER","ADMIN"].includes(String(identity?.role)))return {ok:true as const};
 const sql=db();const rows=await sql`SELECT 1 FROM wgos.communication_threads t JOIN wgos.brand_memberships m ON m.brand_id=t.brand_id AND m.auth_user_id=${String(identity.auth_user_id)} AND m.active=true WHERE t.id=${threadId}::uuid LIMIT 1`;return rows[0]?{ok:true as const}:{ok:false as const,status:403,error:"COMMUNICATION_ACCESS_REQUIRED"};
}

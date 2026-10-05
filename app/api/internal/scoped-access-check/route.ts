import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
export async function GET(req:Request){
 const key=new URL(req.url).searchParams.get("key")||"";
 if(!process.env.DISCOVERY_COMMISSION_SECRET||key!==process.env.DISCOVERY_COMMISSION_SECRET)return NextResponse.json({ok:false},{status:401});
 const sql=db();
 const email="jermaine@studio2016.com";
 const users:any[]=await sql`SELECT auth_user_id,email,display_name,role,active FROM wgos.app_users WHERE lower(email)=${email} LIMIT 1`;
 if(!users[0])return NextResponse.json({ok:false,error:"USER_NOT_FOUND"},{status:404});
 const brands:any[]=await sql`SELECT b.id,b.name,m.membership_role,m.active FROM wgos.brand_memberships m JOIN wgos.brands b ON b.id=m.brand_id WHERE m.auth_user_id=${String(users[0].auth_user_id)} ORDER BY b.name`;
 return NextResponse.json({ok:true,user:users[0],brands});
}

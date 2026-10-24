import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const auth=Boolean(process.env.NEON_AUTH_BASE_URL);
 const database=Boolean(process.env.DATABASE_URL);
 const ready=auth&&database;
 return NextResponse.json({ready,authConfigured:auth,databaseConfigured:database,environment:process.env.VERCEL_ENV==="production"?"production":"nonproduction",message:ready?"Authentication prerequisites present; sign-in still requires end-to-end verification.":"Authentication is unavailable in this deployment. Do not reset your production password."},{status:ready?200:503,headers:{"Cache-Control":"no-store, private"}});
}

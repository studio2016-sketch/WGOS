import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const base=process.env.NEON_AUTH_BASE_URL;
 const auth=Boolean(base),database=Boolean(process.env.DATABASE_URL);
 let providerReachable=false,providerStatus="unavailable";
 if(base){
  try{
   const response=await fetch(base.replace(/\/$/,"")+"/get-session",{method:"GET",headers:{origin:"https://wgos.vercel.app",referer:"https://wgos.vercel.app/login"},cache:"no-store",signal:AbortSignal.timeout(5000)});
   providerReachable=response.status<500;
   providerStatus=response.status===200?"responding":response.status===401||response.status===403?"authorization-required":response.status===404?"route-not-found":response.status<500?"responding-with-error":"provider-error";
  }catch{providerStatus="network-error"}
 }
 return NextResponse.json({ready:auth&&database&&providerReachable,authConfigured:auth,databaseConfigured:database,providerReachable,providerStatus,environment:process.env.VERCEL_ENV==="production"?"production":"nonproduction",message:"This diagnostic never verifies a password or grants access."},{status:auth&&database&&providerReachable?200:503,headers:{"Cache-Control":"no-store, private"}});
}

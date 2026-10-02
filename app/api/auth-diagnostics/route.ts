import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const base=String(process.env.NEON_AUTH_BASE_URL||"");
 const trusted=String(process.env.NEON_AUTH_TRUSTED_ORIGIN||"");
 let reachable=false,status=0;
 try{if(base){const r=await fetch(base.replace(/\/$/,"")+"/get-session",{cache:"no-store"});reachable=true;status=r.status}}catch{}
 let host="";try{host=base?new URL(base).host:""}catch{}
 return NextResponse.json({configured:Boolean(base),authHost:host,trustedOrigin:trusted||null,reachable,status},{headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
}
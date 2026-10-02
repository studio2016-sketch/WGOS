import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const base=String(process.env.NEON_AUTH_BASE_URL||"").replace(/\/$/,"");
 if(!base)return NextResponse.json({ok:false,status:0,code:"AUTH_NOT_CONFIGURED"},{status:503});
 try{
  const trustedOrigin="https://wgos.vercel.app";
  const r=await fetch(base+"/sign-in/email",{method:"POST",headers:{"content-type":"application/json","origin":trustedOrigin,"referer":trustedOrigin+"/login","user-agent":"WGOS-origin-probe"},body:JSON.stringify({email:"origin-check@example.invalid",password:"not-a-real-password",rememberMe:false}),cache:"no-store"});
  let d:any={};try{d=await r.json()}catch{}
  const msg=String(d?.message||d?.error?.message||d?.error||"").slice(0,160);
  return NextResponse.json({ok:true,status:r.status,message:msg||null,trustedOrigin},{headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
 }catch{return NextResponse.json({ok:false,status:0,code:"AUTH_PROBE_FAILED"},{status:503});}
}
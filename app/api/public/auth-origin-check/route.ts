import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const origin=new URL(req.url).origin;
 try{
  const r=await fetch(origin+"/api/auth/sign-in/email",{method:"POST",headers:{"content-type":"application/json","origin":origin,"referer":origin+"/login","user-agent":"WGOS-origin-probe"},body:JSON.stringify({email:"origin-check@example.invalid",password:"not-a-real-password",rememberMe:false}),cache:"no-store"});
  let d:any={};try{d=await r.json()}catch{}
  const msg=String(d?.message||d?.error?.message||d?.error||"").slice(0,160);
  return NextResponse.json({ok:true,status:r.status,message:msg||null,origin},{headers:{"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"}});
 }catch{return NextResponse.json({ok:false,status:0,code:"AUTH_PROXY_PROBE_FAILED"},{status:503});}
}
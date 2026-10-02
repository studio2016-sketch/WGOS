import {NextResponse} from "next/server";

const allowed=new Set(["sign-in/email","sign-out","get-session","request-password-reset","reset-password","send-verification-email","verify-email","email-otp/send-verification-otp","email-otp/verify-email"]);
const internalAuthOrigin=()=>String(process.env.NEON_AUTH_TRUSTED_ORIGIN||"https://wgos.vercel.app").replace(/\/$/,"");

function cleanSetCookie(value:string){
 return value.replace(/;\s*Domain=[^;]+/ig,"");
}

function originAllowed(req:Request,incomingUrl:URL){
 const origin=req.headers.get("origin");
 const site=String(req.headers.get("sec-fetch-site")||"").toLowerCase();
 if(site==="cross-site")return false;
 if(origin&&origin!==incomingUrl.origin)return false;
 return true;
}

async function requestBody(req:Request,suffix:string){
 if(["GET","HEAD"].includes(req.method))return undefined;
 const raw=Buffer.from(await req.arrayBuffer());
 if(suffix!=="request-password-reset")return raw;
 try{
  const data=JSON.parse(raw.toString("utf8"));
  if(data&&typeof data==="object")data.redirectTo=internalAuthOrigin()+"/reset-password";
  return Buffer.from(JSON.stringify(data));
 }catch{return raw}
}

async function proxy(req:Request,{params}:{params:Promise<{path:string[]}>}){
 const base=process.env.NEON_AUTH_BASE_URL;
 if(!base)return NextResponse.json({error:"AUTH_NOT_CONFIGURED"},{status:503,headers:{"Cache-Control":"no-store, private"}});
 const {path}=await params;
 const suffix=(path||[]).join("/");
 if(!allowed.has(suffix))return NextResponse.json({error:"AUTH_ROUTE_NOT_ALLOWED"},{status:404,headers:{"Cache-Control":"no-store, private"}});
 const incomingUrl=new URL(req.url);
 if(req.method==="POST"&&!originAllowed(req,incomingUrl))
  return NextResponse.json({error:"AUTH_ORIGIN_REJECTED"},{status:403,headers:{"Cache-Control":"no-store, private"}});
 const target=base.replace(/\/$/,"")+"/"+suffix+incomingUrl.search;
 const headers=new Headers();
 for(const name of ["content-type","accept","cookie","user-agent","x-forwarded-for"]){
  const value=req.headers.get(name);if(value)headers.set(name,value);
 }
 const trusted=internalAuthOrigin();
 headers.set("origin",trusted);
 headers.set("referer",trusted+"/login");
 const upstream=await fetch(target,{method:req.method,headers,body:await requestBody(req,suffix),redirect:"manual",cache:"no-store"});
 const out=new Headers();
 out.set("cache-control","no-store, private");
 const contentType=upstream.headers.get("content-type");if(contentType)out.set("content-type",contentType);
 const location=upstream.headers.get("location");if(location)out.set("location",location);
 const getSetCookie=(upstream.headers as any).getSetCookie?.bind(upstream.headers);
 const cookies:string[]=getSetCookie?getSetCookie():[];
 if(cookies.length){for(const cookie of cookies)out.append("set-cookie",cleanSetCookie(cookie))}
 else {const one=upstream.headers.get("set-cookie");if(one)out.append("set-cookie",cleanSetCookie(one))}
 return new Response(upstream.body,{status:upstream.status,headers:out});
}

export const GET=proxy;
export const POST=proxy;

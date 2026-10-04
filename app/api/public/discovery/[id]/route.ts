import {NextResponse} from "next/server";
import {getPublicDiscovery,savePublicDiscovery} from "../../../../../lib/discovery";

const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const access=new URL(req.url).searchParams.get("access")||"";
  const data=await getPublicDiscovery(id,access);
  if(!data)return NextResponse.json({ok:false,error:"INVALID_OR_EXPIRED_ACCESS"},{status:403,headers});
  return NextResponse.json({ok:true,discovery:data},{headers});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to load discovery"},{status:400,headers});}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const body=await req.json();
  const assessment=await savePublicDiscovery({opportunityId:id,token:String(body.access||""),answers:body.answers&&typeof body.answers==="object"?body.answers:{}});
  return NextResponse.json({ok:true,assessment},{headers});
 }catch(e){
  const msg=e instanceof Error?e.message:"Unable to save discovery";
  return NextResponse.json({ok:false,error:msg},{status:msg==="INVALID_DISCOVERY_ACCESS"?403:400,headers});
 }
}

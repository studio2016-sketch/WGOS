import {NextResponse} from "next/server";
import {buildSystemExport} from "../../../../lib/system-export";
export const dynamic="force-dynamic";
export async function GET(){
 const headers={"Cache-Control":"no-store, private","X-Robots-Tag":"noindex, nofollow"};
 try{
  const x:any=await buildSystemExport();
  return NextResponse.json({ok:true,format:x.format,version:x.version,security:x.security,counts:x.counts},{headers});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"EXPORT_PROBE_FAILED"},{status:500,headers});}
}
import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../lib/authz";
import {buildSystemExport} from "../../../../lib/system-export";
export const dynamic="force-dynamic";
export async function GET(){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status,headers:{"Cache-Control":"no-store, private"}});
 try{
  const snapshot=await buildSystemExport();
  const date=new Date().toISOString().slice(0,10);
  return new NextResponse(JSON.stringify(snapshot),{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="wgos-system-export-${date}.json"`,"Cache-Control":"no-store, private"}});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"EXPORT_FAILED"},{status:500,headers:{"Cache-Control":"no-store, private"}});}
}
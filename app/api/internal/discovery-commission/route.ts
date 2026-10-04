import {NextResponse} from "next/server";
import {processDiscoveryAutomation} from "../../../../lib/discovery";
// Temporary production commissioning endpoint. Remove after discovery delivery is proven.
export async function GET(req:Request){
 const key=new URL(req.url).searchParams.get("key")||"";
 if(!process.env.DISCOVERY_COMMISSION_SECRET||key!==process.env.DISCOVERY_COMMISSION_SECRET)return NextResponse.json({ok:false},{status:401});
 try{return NextResponse.json({ok:true,result:await processDiscoveryAutomation({limit:20})},{headers:{"Cache-Control":"no-store, private"}})}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"commission_failed"},{status:500});}
}

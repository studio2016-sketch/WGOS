import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../../lib/authz";
import {retryDeadLetter} from "../../../../../../../lib/workflow-health";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{const {id}=await params;const result=await retryDeadLetter({id,actor:String((auth.identity as any).auth_user_id)});return NextResponse.json(result,{headers:{"Cache-Control":"no-store, private"}})}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to retry workflow"},{status:400,headers:{"Cache-Control":"no-store, private"}})}
}
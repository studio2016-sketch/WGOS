import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../../lib/authz";
import {importBoutiqueCatalog} from "../../../../../lib/inventory-import";

export async function POST(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 const origin=req.headers.get("origin");
 if(origin&&origin!==new URL(req.url).origin)return NextResponse.json({error:"Invalid request origin."},{status:403});
 const access=await requireApiBrandAdmin(auth.identity,"dionnesBoutique");
 if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
 try{
  return NextResponse.json(await importBoutiqueCatalog(String(auth.identity.auth_user_id)));
 }catch{
  return NextResponse.json({error:"Catalog import could not complete. Please retry."},{status:500});
 }
}

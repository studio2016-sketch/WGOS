import {NextResponse} from "next/server";
import {requireApiUser,canAccessBrand} from "../../../../lib/authz";
import {globalSearch} from "../../../../lib/intelligence";
import {db} from "../../../../lib/db";

export async function GET(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 const u=new URL(req.url),q=u.searchParams.get("q")||"",brand=u.searchParams.get("brand")||"";
 try{
  const role=String(auth.identity.role||"");
  const isGlobal=["OWNER","ADMIN"].includes(role);
  if(brand){
   if(!isGlobal&&!await canAccessBrand(auth.identity,brand))return NextResponse.json({error:"BRAND_ACCESS_REQUIRED"},{status:403});
   return NextResponse.json({results:await globalSearch(q,brand)});
  }
  if(isGlobal)return NextResponse.json({results:await globalSearch(q)});
  const sql=db();
  const memberships:any[]=await sql`SELECT brand_id FROM wgos.brand_memberships WHERE auth_user_id=${String(auth.identity.auth_user_id)} AND active=true ORDER BY brand_id`;
  const ids=[...new Set(memberships.map((x:any)=>String(x.brand_id)).filter(Boolean))];
  if(!ids.length)return NextResponse.json({results:[]});
  const batches=await Promise.all(ids.map((id:string)=>globalSearch(q,id)));
  const seen=new Set<string>(),results:any[]=[];
  for(const row of batches.flat()){
   const key=String(row.kind)+":"+String(row.id);
   if(seen.has(key))continue;
   seen.add(key);results.push(row);
   if(results.length>=40)break;
  }
  return NextResponse.json({results});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:"Search failed"},{status:400});
 }
}
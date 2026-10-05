import {NextResponse} from "next/server";
import {requireApiUser,canAccessBrand} from "../../../../../lib/authz";
import {db} from "../../../../../lib/db";
import {auditPublicSite} from "../../../../../lib/agent-audits";

export async function GET(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 const brandId=new URL(req.url).searchParams.get("brand")||"";
 if(!brandId)return NextResponse.json({ok:false,error:"BRAND_REQUIRED"},{status:400});
 if(!await canAccessBrand(auth.identity,brandId))return NextResponse.json({ok:false,error:"BRAND_ACCESS_REQUIRED"},{status:403});
 const sql=db();const rows:any[]=await sql`SELECT b.id,b.name,p.public_domain FROM wgos.brands b LEFT JOIN wgos.brand_experience_profiles p ON p.brand_id=b.id WHERE b.id=${brandId} LIMIT 1`;
 const brand=rows[0];if(!brand)return NextResponse.json({ok:false,error:"BRAND_NOT_FOUND"},{status:404});
 if(!brand.public_domain)return NextResponse.json({ok:false,error:"PUBLIC_DOMAIN_NOT_CONFIGURED",brand:{id:brand.id,name:brand.name}},{status:409});
 try{const audit=await auditPublicSite(String(brand.public_domain));return NextResponse.json({ok:true,brand:{id:brand.id,name:brand.name},audit},{headers:{"Cache-Control":"no-store, private"}})}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"AUDIT_FAILED"},{status:500})}
}

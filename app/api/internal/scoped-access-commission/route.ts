import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";

export async function GET(req:Request){
 const key=new URL(req.url).searchParams.get("key")||"";
 if(!process.env.DISCOVERY_COMMISSION_SECRET||key!==process.env.DISCOVERY_COMMISSION_SECRET)return NextResponse.json({ok:false},{status:401});
 const sql=db();
 try{
  await sql`CREATE TABLE IF NOT EXISTS wgos.user_access_invites(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    display_name text NOT NULL,
    app_role text NOT NULL DEFAULT 'TEAM' CHECK(app_role IN ('TEAM','VIEWER')),
    membership_role text NOT NULL DEFAULT 'BRAND_ADMIN' CHECK(membership_role IN ('BRAND_ADMIN','MANAGER','MEMBER','VIEWER')),
    brand_names jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CLAIMED','REVOKED')),
    invited_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    claimed_at timestamptz,
    claimed_auth_user_id text
  )`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS user_access_invites_email_unique_idx ON wgos.user_access_invites(lower(email))`;
  await sql`CREATE INDEX IF NOT EXISTS user_access_invites_email_status_idx ON wgos.user_access_invites(lower(email),status)`;
  const brands=["Jermaine Williams","Studio2016","Charmin & Jermaine","Sound Legacy Institute"];
  const found:any[]=await sql`SELECT id,name FROM wgos.brands WHERE name=ANY(${brands}::text[]) ORDER BY name`;
  if(found.length!==brands.length)throw new Error("Expected Jermaine brand scope is incomplete: "+found.map(x=>x.name).join(", "));
  const email="jermaine@studio2016.com";
  const invite:any[]=await sql`
    INSERT INTO wgos.user_access_invites(email,display_name,app_role,membership_role,brand_names,status,invited_by)
    VALUES(${email},'Jermaine Williams','TEAM','BRAND_ADMIN',${JSON.stringify(brands)}::jsonb,'PENDING','OWNER')
    ON CONFLICT((lower(email))) DO UPDATE SET
      display_name=EXCLUDED.display_name,
      app_role=EXCLUDED.app_role,
      membership_role=EXCLUDED.membership_role,
      brand_names=EXCLUDED.brand_names,
      status='PENDING',
      claimed_at=NULL,
      claimed_auth_user_id=NULL,
      invited_by='OWNER'
    RETURNING id,email,status,brand_names`;
  const secret=process.env.WGOS_DISCOVERY_SHARED_SECRET||"";
  if(!secret)throw new Error("Client email shared secret unavailable.");
  const activation="https://wgos.app/activate?email="+encodeURIComponent(email);
  const mail=await fetch("https://www.studio2016.com/api/wgos/client-email",{method:"POST",headers:{"content-type":"application/json","x-wgos-discovery-secret":secret},body:JSON.stringify({
    to:email,
    replyTo:"booking@studio2016.com",
    eyebrow:"WGOS · SECURE OPERATING ACCESS",
    subject:"Activate your Jermaine WGOS operating login",
    body:"Your independent WGOS operating login is ready to activate. This identity is restricted server-side to Jermaine Williams, Studio2016, Charmin & Jermaine, and Sound Legacy Institute. It does not have master/global access.\n\nCreate your WGOS password here:\n"+activation+"\n\nYour existing master login remains unchanged for unrestricted system administration."
  })});
  const result:any=await mail.json().catch(()=>({}));
  if(!mail.ok)throw new Error(String(result.error||"INVITE_EMAIL_FAILED"));
  return NextResponse.json({ok:true,email,status:invite[0]?.status,brands:found.map(x=>x.name),activation,emailId:result.id||null},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"commission_failed"},{status:500});}
}

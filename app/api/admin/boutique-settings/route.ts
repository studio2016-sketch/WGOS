import {NextResponse} from "next/server";
import {requireApiUser,requireApiBrandAdmin} from "../../../../lib/authz";
import {db} from "../../../../lib/db";
import {boutiqueTaxStatus} from "../../../../lib/boutique-settings";
export async function PUT(req:Request){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 const access=await requireApiBrandAdmin(auth.identity,"dionnesBoutique");
 if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
 try{
  const body=await req.json();
  const s=body.settings;
  if(!s||typeof s.shippingEnabled!=="boolean"||!["PENDING","AUTOMATIC"].includes(s.taxMode)||!Number.isSafeInteger(body.version)||body.version<0)throw new Error("Invalid settings.");
  if(s.shippingEnabled&&(!Number.isSafeInteger(s.shippingCents)||s.shippingCents<0||s.shippingCents>100000||
   !Number.isSafeInteger(s.minDays)||!Number.isSafeInteger(s.maxDays)||s.minDays<1||s.maxDays<s.minDays||s.maxDays>60))throw new Error("Enter a valid shipping charge and delivery window of 1–60 business days.");
  if(s.taxMode==="AUTOMATIC"){
   if(!/^txcd_[0-9]{8}$/.test(s.taxCode)||s.taxBehavior!=="exclusive"||s.taxConfirmed!==true)throw new Error("Confirm the product tax code and price tax treatment.");
   const status=await boutiqueTaxStatus(s.taxCode);
   if(status.status!=="active"||!status.activeUsRegistrations?.length||!status.codeValid)throw new Error("Stripe Tax requires active settings, an active US registration, and a valid product tax code.");
  }
  const settings={shippingEnabled:s.shippingEnabled,shippingCents:s.shippingEnabled?s.shippingCents:null,minDays:s.shippingEnabled?s.minDays:null,maxDays:s.shippingEnabled?s.maxDays:null,taxMode:s.taxMode,taxCode:s.taxMode==="AUTOMATIC"?s.taxCode:null,taxBehavior:"exclusive"};
  const rows=await db()`WITH saved AS (
   UPDATE wgos.boutique_commerce_settings SET settings=${JSON.stringify(settings)}::jsonb,version=version+1,updated_by=${String(auth.identity.auth_user_id)},updated_at=now()
   WHERE brand_id='dionnesBoutique' AND version=${body.version} RETURNING version
  ), audit AS (
   INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
   SELECT ${String(auth.identity.auth_user_id)},'BOUTIQUE_SETTINGS_SAVED','brand','dionnesBoutique',jsonb_build_object('brandId','dionnesBoutique','version',version) FROM saved
  ) SELECT version FROM saved`;
  if(!rows[0])return NextResponse.json({error:"Settings changed. Refresh before saving."},{status:409});
  return NextResponse.json({saved:true,version:Number(rows[0].version)});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Settings could not be saved."},{status:400});}
}

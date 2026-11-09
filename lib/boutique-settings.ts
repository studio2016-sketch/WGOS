import "server-only";
import {db} from "./db";
export async function boutiqueSettings(){
 const rows=await db()`SELECT settings,version FROM wgos.boutique_commerce_settings WHERE brand_id='dionnesBoutique'`;
 return rows[0]||{settings:{},version:0};
}
export async function boutiqueTaxStatus(taxCode?:string){
 const secret=process.env.BOUTIQUE_ORDER_SYNC_SECRET;
 if(!secret)throw new Error("Tax status connection unavailable.");
 const suffix=taxCode?"?taxCode="+encodeURIComponent(taxCode):"";
 const response=await fetch("https://dionnesboutique.com/api/internal/tax-status"+suffix,{headers:{authorization:"Bearer "+secret},cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Stripe Tax status could not be checked.");
 return response.json();
}

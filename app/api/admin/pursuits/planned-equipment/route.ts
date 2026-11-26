import {NextResponse} from 'next/server';
import {requireApiUser,requireApiBrandAdmin} from '../../../../../lib/authz';
import {importStudioPlannedEquipment} from '../../../../../lib/studio-planned-equipment';
import {isSameOriginPlanRequest,parsePlanImport,PlanImportError,readPlanJson,STUDIO_PLAN_BRAND} from '../../../../../lib/studio-planned-equipment-input';

export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, private','X-Robots-Tag':'noindex, nofollow'};
function reply(body:object,status=200){return NextResponse.json(body,{status,headers});}
export async function POST(req:Request){
 if(!isSameOriginPlanRequest(req))return reply({error:'A same-origin Studio2016 request is required.'},403);
 try{
  const auth=await requireApiUser();
  if(!auth.ok)return reply({error:auth.error},auth.status);
  const scope=await requireApiBrandAdmin(auth.identity,STUDIO_PLAN_BRAND);
  if(!scope.ok)return reply({error:scope.error},scope.status);
  const items=parsePlanImport(await readPlanJson(req));
  const result=await importStudioPlannedEquipment(items,String(auth.identity.auth_user_id));
  if(result.conflicts.length)return reply({error:'Existing data conflicts with this batch. No rows were added or changed.',conflicts:result.conflicts},409);
  return reply({ok:true,items:result.items});
 }catch(error){
  if(error instanceof PlanImportError)return reply({error:error.message},error.status);
  if((error as {code?:string})?.code==='23505')return reply({error:'A concurrent import occupied a code. No rows changed; review and retry the same batch.'},409);
  return reply({error:'Planned equipment could not be imported. No result was confirmed; retry the same batch safely.'},503);
 }
}

/** Sanitized, payload-free classification for WGOS scheduled job outcomes. */
export type CronJobSummary={name:string;status:"OK"|"SKIPPED"|"FAILED"|"QUOTA_EXCEEDED"};
function failureText(value:unknown):string{
 if(typeof value==="string")return value;
 if(value instanceof Error)return value.message;
 if(Array.isArray(value))return value.map(failureText).join(" ");
 if(value&&typeof value==="object"){
  const v=value as {error?:unknown;message?:unknown;errors?:unknown};
  return [v.error,v.message,v.errors].map(failureText).join(" ");
 }
 return "";
}
export function isQuotaFailure(value:unknown):boolean{
 return /(?:HTTP\s*(?:status\s*)?402|exceeded\s+the\s+quota|quota\s+exceeded)/i.test(failureText(value));
}
export function summarizeCronJobs(names:readonly string[],outcomes:readonly PromiseSettledResult<unknown>[]):CronJobSummary[]{
 return names.map((name,i)=>{
  const outcome=outcomes[i];
  if(!outcome)return {name,status:"FAILED"};
  if(outcome.status==="rejected")return {name,status:isQuotaFailure(outcome.reason)?"QUOTA_EXCEEDED":"FAILED"};
  const value=outcome.value;
  if(value&&typeof value==="object"){
   const v=value as {ok?:unknown;success?:unknown;configured?:unknown;failed?:unknown;errors?:unknown};
   if(v.ok===false||v.success===false||
      (typeof v.failed==="number"&&v.failed>0)||
      (Array.isArray(v.errors)&&v.errors.length>0))
    return {name,status:isQuotaFailure(value)?"QUOTA_EXCEEDED":"FAILED"};
   if(v.configured===false)return {name,status:"SKIPPED"};
  }
  return {name,status:"OK"};
 });
}

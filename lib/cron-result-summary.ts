/** Sanitized, payload-free classification for cron job outcomes. */
export type CronJobSummary = {name:string;status:"OK"|"SKIPPED"|"FAILED"|"QUOTA_EXCEEDED"};

function failureText(value:unknown):string{
 if(typeof value==="string")return value;
 if(value instanceof Error)return value.message;
 if(value&&typeof value==="object"){
  const record=value as {error?:unknown;message?:unknown;errors?:unknown;statusCode?:unknown};
  const messages:unknown[]=[record.error,record.message,
   ...(Array.isArray(record.errors)?record.errors.slice(0,10):[])];
  if(record.statusCode===402)messages.push("HTTP 402");
  return messages.filter(x=>typeof x==="string").join(" ");
 }
 return "";
}

export function isQuotaFailure(value:unknown):boolean{
 return /(?:HTTP\s*(?:status\s*)?402|exceeded\s+the\s+quota|quota\s+exceeded)/i.test(failureText(value));
}

function hasReportedFailure(value:Record<string,unknown>):boolean{
 const failed=value.failed;
 return value.ok===false||value.success===false||
  (typeof failed==="number"&&Number.isFinite(failed)&&failed>0)||
  (Array.isArray(value.errors)&&value.errors.length>0)||
  (typeof value.error==="string"&&value.error.trim().length>0)||
  (typeof value.status==="string"&&/^(FAILED|ERROR|DEGRADED|QUOTA_EXCEEDED)$/i.test(value.status));
}

export function summarizeCronJobs(names:readonly string[],outcomes:readonly PromiseSettledResult<unknown>[]):CronJobSummary[]{
 return names.map((name,i)=>{
  const outcome=outcomes[i];
  if(!outcome)return {name,status:"FAILED"};
  if(outcome.status==="rejected")return {name,status:isQuotaFailure(outcome.reason)?"QUOTA_EXCEEDED":"FAILED"};
  const value=outcome.value;
  if(value&&typeof value==="object"){
   const record=value as Record<string,unknown>;
   if(hasReportedFailure(record))
    return {name,status:isQuotaFailure(value)?"QUOTA_EXCEEDED":"FAILED"};
   if(record.configured===false)return {name,status:"SKIPPED"};
  }
  return {name,status:"OK"};
 });
}

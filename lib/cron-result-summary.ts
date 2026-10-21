/** Sanitized, payload-free classification for cron job outcomes. */
export type CronJobSummary = {name:string;status:"OK"|"FAILED"|"QUOTA_EXCEEDED"};

function failureText(value:unknown):string{
 if(typeof value==="string")return value;
 if(value instanceof Error)return value.message;
 if(value&&typeof value==="object"){
  const record=value as {error?:unknown;message?:unknown};
  return [record.error,record.message].filter(x=>typeof x==="string").join(" ");
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
  const reportedFailure=!!value&&typeof value==="object"&&(
   ("ok" in value&&(value as {ok?:unknown}).ok===false)||
   ("success" in value&&(value as {success?:unknown}).success===false)
  );
  if(reportedFailure)return {name,status:isQuotaFailure(value)?"QUOTA_EXCEEDED":"FAILED"};
  return {name,status:"OK"};
 });
}

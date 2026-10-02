import "server-only";

const TOKEN_URL="https://oauth2.googleapis.com/token";

function required(name:string){const v=process.env[name];if(!v)throw new Error(name+" is not configured");return v;}
async function accessToken(refreshEnv:"GOOGLE_REFRESH_TOKEN_MGMT"|"GOOGLE_REFRESH_TOKEN_DRIVE"){
 const body=new URLSearchParams({
  client_id:required("GOOGLE_CLIENT_ID"),
  client_secret:required("GOOGLE_CLIENT_SECRET"),
  refresh_token:required(refreshEnv),
  grant_type:"refresh_token"
 });
 const r=await fetch(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,cache:"no-store"});
 const d:any=await r.json().catch(()=>({}));
 if(!r.ok||!d.access_token)throw new Error("Google OAuth refresh failed.");
 return String(d.access_token);
}
async function googleJson(url:string,token:string,init:RequestInit={}){
 const r=await fetch(url,{...init,headers:{Authorization:"Bearer "+token,Accept:"application/json",...(init.headers||{})},cache:"no-store"});
 const text=await r.text();let data:any={};try{data=text?JSON.parse(text):{}}catch{}
 if(!r.ok)throw new Error("Google API request failed ("+r.status+").");
 return data;
}

export async function verifyGoogleGmail(){
 const token=await accessToken("GOOGLE_REFRESH_TOKEN_MGMT");
 const d=await googleJson("https://gmail.googleapis.com/gmail/v1/users/me/profile",token);
 return {connected:Boolean(d?.emailAddress),account:String(d?.emailAddress||process.env.GOOGLE_GMAIL_ACCOUNT||"")};
}
export async function verifyGoogleCalendar(){
 const token=await accessToken("GOOGLE_REFRESH_TOKEN_MGMT");
 const id=String(process.env.GOOGLE_CALENDAR_ID||process.env.GOOGLE_GMAIL_ACCOUNT||"primary");
 const d=await googleJson("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(id),token);
 return {connected:Boolean(d?.id),calendarId:String(d?.id||id),timezone:String(d?.timeZone||"")};
}
export async function verifyGoogleDrive(){
 const token=await accessToken("GOOGLE_REFRESH_TOKEN_DRIVE");
 const d=await googleJson("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName),storageQuota",token);
 return {connected:Boolean(d?.user?.emailAddress),account:String(d?.user?.emailAddress||process.env.GOOGLE_DRIVE_ACCOUNT||"")};
}

export async function createGoogleCalendarEvent(input:{title:string;startAt:string;endAt:string;timezone:string;description?:string|null}){
 const token=await accessToken("GOOGLE_REFRESH_TOKEN_MGMT");
 const calendarId=String(process.env.GOOGLE_CALENDAR_ID||process.env.GOOGLE_GMAIL_ACCOUNT||"primary");
 const payload={
  summary:input.title,
  description:input.description||undefined,
  start:{dateTime:new Date(input.startAt).toISOString(),timeZone:input.timezone||undefined},
  end:{dateTime:new Date(input.endAt).toISOString(),timeZone:input.timezone||undefined}
 };
 const d=await googleJson("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId)+"/events",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
 if(!d?.id)throw new Error("Google Calendar did not return an event id.");
 return {externalId:String(d.id),htmlLink:d.htmlLink?String(d.htmlLink):null,status:String(d.status||"confirmed")};
}
export async function cancelGoogleCalendarEvent(externalId:string){
 const token=await accessToken("GOOGLE_REFRESH_TOKEN_MGMT");
 const calendarId=String(process.env.GOOGLE_CALENDAR_ID||process.env.GOOGLE_GMAIL_ACCOUNT||"primary");
 const r=await fetch("https://www.googleapis.com/calendar/v3/calendars/"+encodeURIComponent(calendarId)+"/events/"+encodeURIComponent(externalId),{method:"DELETE",headers:{Authorization:"Bearer "+token},cache:"no-store"});
 if(!r.ok&&r.status!==410&&r.status!==404)throw new Error("Google Calendar cancellation failed ("+r.status+").");
 return {cancelled:true};
}

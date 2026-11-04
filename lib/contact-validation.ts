export function validateContact(firstName:unknown,lastName:unknown,emailAddress:unknown){
 const first=String(firstName??"").trim(),last=String(lastName??"").trim(),email=String(emailAddress??"").trim().toLowerCase();
 if(!first||!last)throw new Error("First name and last name are required.");
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("A valid email address is required.");
 return {first,last,email};
}

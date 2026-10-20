export function validEmailRecipient(raw:unknown):boolean {
 const value=String(raw??'').trim();
 return value.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
}

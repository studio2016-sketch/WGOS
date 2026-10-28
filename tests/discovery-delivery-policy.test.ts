import test from "node:test";
import assert from "node:assert/strict";
import {isPlausibleContactEmail,safeDiscoveryDeliveryError} from "../lib/discovery-delivery-policy";

test("discovery email guard accepts ordinary addresses",()=>{
 assert.equal(isPlausibleContactEmail("client@example.com"),true);
 assert.equal(isPlausibleContactEmail("first.last+tag@example.co.uk"),true);
});
test("discovery email guard rejects malformed addresses",()=>{
 for(const input of ["","not-an-email","a@","a@invalid","a@@example.com","a b@example.com","a..b@example.com"]){
  assert.equal(isPlausibleContactEmail(input),false,String(input));
 }
});
test("delivery errors do not expose customer email addresses",()=>{
 const message=safeDiscoveryDeliveryError(new Error("Invalid email address client@example.com"));
 assert.equal(message.includes("client@example.com"),false);
 assert.equal(message.includes("[redacted-email]"),true);
});

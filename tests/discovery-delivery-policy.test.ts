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
test("provider error classification never exposes customer data",()=>{
 const errors=[
  [new Error("Invalid email address client@example.com"),"INVALID_CONTACT_EMAIL"],
  [new Error("Rate limit 429 for client@example.com"),"DISCOVERY_DELIVERY_RATE_LIMITED"],
  [new Error("Unauthorized 401 for client@example.com"),"DISCOVERY_DELIVERY_AUTH_FAILURE"],
  [new Error("Client name and token secret=abc123"),"DISCOVERY_DELIVERY_FAILED"],
 ];
 for(const [err,expected] of errors){
  const actual=safeDiscoveryDeliveryError(err);
  assert.equal(actual,expected);
  assert.equal(actual.includes("client@example.com"),false);
  assert.equal(actual.includes("abc123"),false);
 }
});

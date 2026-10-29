import test from "node:test";
import assert from "node:assert/strict";
import {isPlausibleContactEmail,safeDiscoveryDeliveryError,isApprovedDiscoverySender} from "../lib/discovery-delivery-policy";

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


test("discovery transport is restricted to Studio2016",()=>{
 assert.equal(isApprovedDiscoverySender("studio2016"),true);
 for(const brand of ["charmin","charminJermaine","soundLegacy","",null,undefined]) {
  assert.equal(isApprovedDiscoverySender(brand),false,String(brand));
 }
});

// Provider telemetry identified repeated 422 responses for this malformed-address class.
// This test uses synthetic addresses only; no customer data or provider calls.
test("discovery email guard rejects consecutive dots in domain labels",()=>{
 for(const email of ["client@example..com","client@sub..example.com","client@example.com.."]){
  assert.equal(isPlausibleContactEmail(email),false,email);
 }
});

test("discovery email guard rejects invalid local and DNS label edges",()=>{
 for(const email of [
  ".client@example.com","client.@example.com","client@-example.com",
  "client@example-.com","client@sub.-example.com","client@sub.example-.com",
  `client@${"a".repeat(64)}.com`
 ])assert.equal(isPlausibleContactEmail(email),false,email);
 assert.equal(isPlausibleContactEmail("client@xn--bcher-kva.example"),true);
});

test("Resend invalid recipient field is classified without exposing provider details",()=>{
 const error=new Error("Invalid `to` field. The email address needs to follow the `user@example.com` format.");
 const classified=safeDiscoveryDeliveryError(error);
 assert.equal(classified,"INVALID_CONTACT_EMAIL");
 assert.equal(classified.includes("user@example.com"),false);
});

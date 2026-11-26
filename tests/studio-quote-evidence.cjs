const assert=require("node:assert/strict");
const test=require("node:test");
const {collectEvidence,verifyEvidencePointer,SOURCE_TEXT_LIMIT}=require("../lib/studio-quote-evidence.ts");

test("preserves pasted line numbers and literal text including exclusions and multiple groups",()=>{
 const r=collectEvidence("Intro\r\n\r\n  Do not supply venue rigging; power is exclusive. \r\nProvide an audio mixer and lighting crew.\nThanks.");
 assert.equal(r.ok,true);
 assert.deepEqual(r.candidates,[
  {line:3,excerpt:"Do not supply venue rigging; power is exclusive.",groups:["Stage and rigging","Power and access","Procurement"]},
  {line:4,excerpt:"Provide an audio mixer and lighting crew.",groups:["Sound","Lighting","Crew and timing"]},
 ]);
 assert.equal(verifyEvidencePointer(r.lines,3,r.candidates[0].excerpt),true);
 assert.equal(verifyEvidencePointer(r.lines,3,"supply venue rigging"),false);
 assert.equal(verifyEvidencePointer(r.lines,4,r.candidates[0].excerpt),false);
 assert.equal(verifyEvidencePointer(r.lines,"3",r.candidates[0].excerpt),false);
 assert.equal(verifyEvidencePointer(r.lines,2,""),false);
});

test("empty or oversized input fails; no inferred requirements for unrelated text",()=>{
 assert.equal(collectEvidence("  ").ok,false);
 assert.equal(collectEvidence("x".repeat(SOURCE_TEXT_LIMIT+1)).ok,false);
 assert.equal(collectEvidence("x".repeat(901)).ok,false);
 assert.equal(collectEvidence("x\n".repeat(401)).ok,false);
 assert.deepEqual(collectEvidence("Thank you.").candidates,[]);
});

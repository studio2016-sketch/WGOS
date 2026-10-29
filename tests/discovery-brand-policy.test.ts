import test from "node:test";
import assert from "node:assert/strict";
import { discoveryPromptForBrand, publicDiscoveryMessageMetadata } from "../lib/discovery-brand-policy";

test("Studio2016 wording is limited to Studio2016", () => {
  const studio = "What should Studio2016 deliver?";
  const generic = "What services or deliverables would you like?";
  assert.equal(discoveryPromptForBrand("studio2016", studio, generic), studio);
  for (const brand of ["charmin", "charminJermaine", "soundLegacy", "", null]) {
    assert.equal(discoveryPromptForBrand(brand, studio, generic), generic);
  }
});

test("discovery metadata preserves brand identity and uses a neutral provider", () => {
  const meta = publicDiscoveryMessageMetadata({
    brandId: "charmin",
    opportunityId: "opportunity-1",
    answers: { scopeDetails: "Concert" },
    status: "DISCOVERY_REQUIRED",
  });
  assert.equal(meta.provider, "WGOS_PUBLIC_DISCOVERY");
  assert.equal(meta.brandId, "charmin");
  assert.equal(meta.opportunityId, "opportunity-1");
  assert.equal(JSON.stringify(meta).includes("STUDIO2016_DISCOVERY"), false);
  assert.throws(() => publicDiscoveryMessageMetadata({brandId:"",opportunityId:"x",answers:{},status:""}));
});

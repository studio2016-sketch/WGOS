/** Pure, brand-scoped discovery presentation helpers. Never infer a sender from this metadata. */
export function discoveryPromptForBrand(brandId: unknown, studioPrompt: string, genericPrompt: string): string {
  return brandId === "studio2016" ? studioPrompt : genericPrompt;
}

/** Keep communication records brand-specific without falsely labeling them Studio2016. */
export function publicDiscoveryMessageMetadata(input: {
  brandId: string;
  opportunityId: string;
  answers: Record<string, unknown>;
  status: string;
}) {
  if (!input.brandId || !input.opportunityId) throw new Error("DISCOVERY_BRAND_CONTEXT_REQUIRED");
  return {
    provider: "WGOS_PUBLIC_DISCOVERY",
    brandId: input.brandId,
    opportunityId: input.opportunityId,
    answers: input.answers,
    status: input.status,
  };
}

/** Public discovery links may only mutate opportunities still in intake. */
export function canAcceptPublicDiscoveryStage(stage: unknown): boolean {
  return stage === "NEW" || stage === "QUALIFYING" || stage === "DISCOVERY";
}

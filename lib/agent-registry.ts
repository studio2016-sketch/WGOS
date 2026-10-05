export type AgentRiskClass=0|1|2|3;
export type AgentDefinition={
 id:string;name:string;domain:string;purpose:string;riskClass:AgentRiskClass;
 mode:"observe"|"propose";status:"ready"|"planned";checks:string[];
};
export const agentDefinitions:AgentDefinition[]=[
 {id:"web-director",name:"Web Director",domain:"Orchestration",purpose:"Decompose website objectives, delegate specialist work, gather evidence and prepare owner review.",riskClass:2,mode:"propose",status:"planned",checks:["brand scope","delegation plan","owner review"]},
 {id:"visual-ux-qa",name:"Visual / UX QA",domain:"Experience",purpose:"Inspect responsiveness, interaction, readability, consistency and brand compliance.",riskClass:0,mode:"observe",status:"ready",checks:["responsive","interaction","brand rules","evidence"]},
 {id:"technical-qa",name:"Technical QA",domain:"Engineering",purpose:"Verify builds, routes, browser behavior and runtime errors before work is considered complete.",riskClass:0,mode:"observe",status:"ready",checks:["build","typecheck","routes","browser smoke"]},
 {id:"seo-aeo-geo",name:"SEO · AEO · GEO",domain:"Discovery",purpose:"Audit search, answer-engine and generative-engine readiness and propose evidence-backed improvements.",riskClass:1,mode:"observe",status:"ready",checks:["metadata","structured content","internal links","entity clarity"]},
 {id:"accessibility",name:"Accessibility",domain:"Experience",purpose:"Detect common accessibility barriers and produce prioritized remediation guidance.",riskClass:0,mode:"observe",status:"ready",checks:["semantics","keyboard","labels","focus","contrast"]},
 {id:"performance",name:"Performance",domain:"Engineering",purpose:"Identify loading, asset and runtime regressions that can damage experience or conversion.",riskClass:0,mode:"observe",status:"ready",checks:["loading","asset weight","runtime","CWV risk"]},
 {id:"conversion",name:"Conversion",domain:"Commercial",purpose:"Review calls to action, friction, trust and continuity from site visit to proposal or booking.",riskClass:2,mode:"observe",status:"ready",checks:["CTA","friction","trust","journey continuity"]},
 {id:"content-steward",name:"Content Steward",domain:"Brand",purpose:"Find stale content, inconsistent facts, broken assets and brand-language drift.",riskClass:1,mode:"observe",status:"ready",checks:["freshness","facts","assets","brand voice"]},
 {id:"security-reviewer",name:"Security Reviewer",domain:"Risk",purpose:"Review code, dependency and configuration risk and block unsafe autonomous publishing.",riskClass:3,mode:"observe",status:"planned",checks:["dependencies","configuration","secrets","release risk"]}
];
export const riskPolicies=[
 {riskClass:0,label:"Observe",rule:"May inspect and report automatically. No mutation."},
 {riskClass:1,label:"Safe proposal",rule:"May prepare a reversible branch/preview. Merge remains policy-gated."},
 {riskClass:2,label:"Business-facing",rule:"Authorized brand owner approval required before publication or business-impacting change."},
 {riskClass:3,label:"Protected",rule:"Money, contracts, permissions, credentials, destructive data/schema and production security always require explicit human approval."}
] as const;

/** Local quote-intake evidence. Detection is advisory, never a pricing or readiness decision. */
export const EVIDENCE_GROUPS = ["Sound", "Lighting", "Video", "Stage and rigging", "Crew and timing", "Power and access", "Procurement"] as const;
type Group = typeof EVIDENCE_GROUPS[number];
export type EvidenceCandidate = {line:number; excerpt:string; groups:Group[]};
export const SOURCE_LINE_LIMIT = 400;
export const SOURCE_TEXT_LIMIT = 24000;
const SOURCE_LINE_LENGTH_LIMIT = 900;
const patterns: Record<Group, RegExp> = {
  Sound: /\b(PA|audio|sound|mix(?:er|ing)?\s+console|microphones?|in[- ]ear|monitors?|line array)\b/i,
  Lighting: /\b(light(?:ing|s)|moving heads?|wash fixtures?|followspots?|DMX)\b/i,
  Video: /\b(camera\w*|video|projection|IMAG|LED\s+(?:wall|screen|panels?)|livestream)\b/i,
  "Stage and rigging": /\b(stag(?:e|es|ing)|roof|rigging|truss|ballast|wind plan|hoists?)\b/i,
  "Crew and timing": /\b(crew|stagehands?|rehearsal|soundcheck|overtime|load[- ]?(?:in|out)|strike|operators?)\b/i,
  "Power and access": /\b(generator|power|voltage|distro|electrical|dock|liftgate|forklift|ground support|freight)\b/i,
  Procurement: /\b(mandatory|deadline|references?|insurance|submission|certifi(?:cate|cates|cation)|terms|purchase order|minimum|addendum|not included|exclusive)\b/i,
};

export function collectEvidence(source:string): {ok:true;lines:string[];candidates:EvidenceCandidate[]}|{ok:false;reason:string} {
  if (!source.trim()) return {ok:false,reason:"Paste source text first."};
  if (source.length>SOURCE_TEXT_LIMIT) return {ok:false,reason:"Source is too long. Split it by exhibit or section without omitting requirements."};
  const lines=source.split(/\r\n|\n|\r/);
  if(lines.length>SOURCE_LINE_LIMIT) return {ok:false,reason:"Too many lines. Split the source by exhibit or section."};
  if(lines.some(line=>line.length>SOURCE_LINE_LENGTH_LIMIT)) return {ok:false,reason:"A line is too long to review as one excerpt. Split it before reviewing."};
  const candidates=lines.flatMap((line,index)=>{
    const excerpt=line.trim();
    const groups=EVIDENCE_GROUPS.filter(group=>patterns[group].test(excerpt));
    return groups.length?[{line:index+1,excerpt,groups}]:[];
  });
  return {ok:true,lines,candidates};
}

/** Optional downstream AI adapter boundary: only accept exact excerpts from the selected input.
 * This verifies quotation provenance, not the interpretation, completeness or relevance of an excerpt.
 */
export function verifyEvidencePointer(lines:readonly string[],line:unknown,excerpt:unknown):boolean {
  return Number.isInteger(line) && typeof line==="number" && line>=1 && line<=lines.length &&
    typeof excerpt==="string" && excerpt.length>0 && excerpt===lines[line-1].trim();
}

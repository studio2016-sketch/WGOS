export type SeoBusiness = { id: string; name: string; domain: string; priority: number };
export type SeoMetric = { businessId: string; date: string; clicks: number | null; impressions: number | null; inquiries: number | null; bookings: number | null; revenue: number | null; source: "gsc" | "ga4" | "wgos" };
export const seoBusinesses: SeoBusiness[] = [
  { id: "jermaine-williams", name: "Jermaine Williams", domain: "jermainewilliams.com", priority: 1 },
  { id: "studio2016", name: "Studio2016", domain: "studio2016.com", priority: 1 },
  { id: "charmin-jermaine", name: "Charmin & Jermaine", domain: "charminjermaine.com", priority: 1 },
  { id: "charmin-greene", name: "Charmin Greene", domain: "charmingreene.com", priority: 2 },
  { id: "dionnes-boutique", name: "Dionne's Boutique", domain: "dionnesboutique.com", priority: 2 },
  { id: "bass-one", name: "Bass One Basses", domain: "", priority: 2 }
];
export const seoDataSources = [
  { id: "gsc", label: "Google Search Console", purpose: "Search clicks, impressions, queries, indexing" },
  { id: "ga4", label: "Google Analytics 4", purpose: "Landing-page visits and conversions" },
  { id: "wgos", label: "WGOS CRM", purpose: "Qualified inquiries, bookings, attributable revenue" }
] as const;

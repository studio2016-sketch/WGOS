import type { ReactNode } from "react";
import { requireAdmin } from "../../../lib/authz";
export const dynamic = "force-dynamic";
export const metadata = { title: "Private SEO Command Center", robots: { index: false, follow: false, nocache: true } };
export default async function PrivateSeoLayout({children}:{children:ReactNode}) {
  await requireAdmin();
  return children;
}

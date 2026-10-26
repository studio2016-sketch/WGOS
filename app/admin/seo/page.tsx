import { redirect } from "next/navigation";
import { currentIdentity } from "../../../lib/authz";
import { seoBusinesses, seoDataSources } from "../../../lib/seo-command-center";
export default async function SeoCommandCenter() {
  const identity: any = await currentIdentity();
  if (!identity) redirect("/login");
  if (!["OWNER", "ADMIN"].includes(String(identity.role))) redirect("/work");
  return <main style={{padding:"clamp(20px,4vw,48px)",maxWidth:1200,margin:"auto",fontSize:16}}>
    <h1 style={{fontSize:"clamp(28px,4vw,42px)"}}>SEO Command Center</h1>
    <p>Search visibility, booking attribution and revenue intelligence across Williams businesses.</p>
    <section aria-label="Data source status" style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:16,marginBlock:24}}>
      {seoDataSources.map(source=><article key={source.id} style={{border:"1px solid #8886",borderRadius:12,padding:20}}>
        <h2 style={{fontSize:20}}>{source.label}</h2><p>{source.purpose}</p><strong>Not connected / not verified</strong>
      </article>)}
    </section>
    <h2 style={{fontSize:24}}>Business portfolio</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
      {seoBusinesses.map(b=><article key={b.id} style={{border:"1px solid #8886",borderRadius:12,padding:20}}>
        <h3 style={{fontSize:20}}>{b.name}</h3><p>{b.domain || "Domain pending verification"}</p>
        <p>Priority {b.priority}</p><p>Clicks: — · Inquiries: — · Revenue: —</p>
        <small>Awaiting verified source data</small>
      </article>)}
    </div>
    <p style={{marginTop:24}}>No fabricated performance data. Integrations must be authorized, verified and scoped per business before ingestion.</p>
  </main>;
}

import AdminNav from "../AdminNav";
import { commandAccess } from "../../../lib/authz";
import { listPurposeEngine } from "../../../lib/purpose-engine";
import PurposeCenter from "./PurposeCenter";

export default async function PurposePage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const query = await searchParams;
  const access = await commandAccess();
  const data: any = await listPurposeEngine(access.identity.auth_user_id, access.isGlobal);
  const selectedBrand = data.brands.some((b: any) => b.id === query.brand) ? String(query.brand) : "";
  return <main className="admin">
    <AdminNav active="purpose" brands={data.brands} brand={selectedBrand} />
    <header className="adminHead commandHero">
      <div>
        <p className="eyebrow">WGOS · PURPOSE</p>
        <h1>Purpose Command</h1>
        <p>Make purpose operational. Align strategy, policies, decisions, outcomes and learning to why each business exists.</p>
        <div className="heroSignals"><span>✦ PURPOSE FIRST</span><span>◈ DECISION GATES</span><span>↗ LEARNING LOOP</span></div>
      </div>
    </header>
    <PurposeCenter data={data} initialBrand={selectedBrand} />
  </main>;
}

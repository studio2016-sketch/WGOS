"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function PurposeCenter({ data, initialBrand = "" }: { data: any; initialBrand?: string }) {
  const router = useRouter();
  const [brand, setBrand] = useState(initialBrand || data.brands?.[0]?.id || "");
  const [tab, setTab] = useState("purpose");
  const [evaluationId, setEvaluationId] = useState("");
  const [error, setError] = useState("");

  const profile = data.profiles.find((x: any) => x.brand_id === brand) || {};
  const principles = data.principles.filter((x: any) => x.brand_id === brand);
  const priorities = data.priorities.filter((x: any) => x.brand_id === brand);
  const criteria = data.criteria.filter((x: any) => x.brand_id === brand);
  const evaluations = data.evaluations.filter((x: any) => x.brand_id === brand);
  const selectedEvaluation = evaluations.find((x: any) => x.id === evaluationId) || evaluations[0] || null;
  const scores = selectedEvaluation ? data.scores.filter((x: any) => x.evaluation_id === selectedEvaluation.id) : [];
  const outcome = selectedEvaluation ? data.outcomes.find((x: any) => x.evaluation_id === selectedEvaluation.id) : null;

  async function send(body: any) {
    setError("");
    const response = await fetch("/api/admin/purpose", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, brandId: brand }),
    });
    const json = await response.json();
    if (!json.ok) {
      setError(json.error || "Unable to save.");
      return false;
    }
    router.refresh();
    return true;
  }

  const alignedCount = evaluations.filter((x: any) => x.status === "ALIGNED").length;
  const conditionalCount = evaluations.filter((x: any) => x.status === "CONDITIONAL").length;
  const misalignedCount = evaluations.filter((x: any) => ["MISALIGNED", "OVERRIDDEN"].includes(x.status)).length;

  return <div className="purposeWorkspace cinematicWorkspace" style={{ display: "grid", gap: 18 }}>
    <section className="adminPanel" style={{ padding: 18 }}>
      <div className="attentionIntro">
        <p className="eyebrow">PURPOSE ENGINE</p>
        <h2>Purpose → strategy → policy → action → learning</h2>
        <p>Define why the business exists, translate that purpose into operating rules, test consequential decisions against it, and learn from actual outcomes.</p>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <select value={brand} onChange={e => { setBrand(e.target.value); setEvaluationId(""); }}>
          {data.brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {["purpose", "principles", "priorities", "criteria", "decisions", "learning"].map(x =>
          <button key={x} className={tab === x ? "newAction" : ""} onClick={() => setTab(x)}>{x}</button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
        <article><small>PURPOSE STATUS</small><strong style={{ display: "block", fontSize: "1.35rem" }}>{profile.status || "DRAFT"}</strong><span>version {profile.version || 1}</span></article>
        <article><small>ACTIVE PRIORITIES</small><strong style={{ display: "block", fontSize: "1.35rem" }}>{priorities.filter((x: any) => x.status === "ACTIVE").length}</strong></article>
        <article><small>ALIGNED DECISIONS</small><strong style={{ display: "block", fontSize: "1.35rem" }}>{alignedCount}</strong></article>
        <article><small>NEEDS JUDGMENT</small><strong style={{ display: "block", fontSize: "1.35rem" }}>{conditionalCount + misalignedCount}</strong></article>
      </div>
      {error && <p style={{ marginTop: 10 }}>{error}</p>}
    </section>

    {tab === "purpose" && <section className="adminPanel" style={{ padding: 18 }}>
      <h2>Purpose profile</h2>
      <form onSubmit={async e => {
        e.preventDefault();
        const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
        body.action = "profile";
        body.requireOverrideReason = Boolean(body.requireOverrideReason);
        await send(body);
      }} style={{ display: "grid", gap: 10 }}>
        <textarea name="purposeStatement" defaultValue={profile.purpose_statement || ""} placeholder="Purpose — why does this business exist?" />
        <textarea name="missionStatement" defaultValue={profile.mission_statement || ""} placeholder="Mission — what do we do, for whom, and how?" />
        <textarea name="visionStatement" defaultValue={profile.vision_statement || ""} placeholder="Vision — what future are we trying to create?" />
        <input name="primaryBeneficiary" defaultValue={profile.primary_beneficiary || ""} placeholder="Primary beneficiary / who we serve" />
        <textarea name="corePromise" defaultValue={profile.core_promise || ""} placeholder="Core promise to clients/community" />
        <textarea name="definitionOfExcellence" defaultValue={profile.definition_of_excellence || ""} placeholder="What does excellence mean here?" />
        <input name="northStarMetric" defaultValue={profile.north_star_metric || ""} placeholder="North-star metric" />
        <input name="planningHorizon" defaultValue={profile.planning_horizon || ""} placeholder="Planning horizon, e.g. 3 years" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>
          <label>Minimum alignment score<input name="minimumAlignmentScore" type="number" min="0" max="100" defaultValue={profile.minimum_alignment_score ?? 65} /></label>
          <label>Override threshold<input name="overrideBelowScore" type="number" min="0" max="100" defaultValue={profile.override_below_score ?? 45} /></label>
          <label>Status<select name="status" defaultValue={profile.status || "DRAFT"}><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option></select></label>
        </div>
        <label><input name="requireOverrideReason" type="checkbox" defaultChecked={profile.require_override_reason !== false} /> Require written reason for purpose override</label>
        <button className="newAction" type="submit">Save purpose profile</button>
      </form>
    </section>}

    {tab === "principles" && <section className="adminPanel" style={{ padding: 18 }}>
      <h2>Principles & non-negotiables</h2>
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {principles.map((p: any) => <article key={p.id} style={{ padding: 11, border: "1px solid rgba(255,255,255,.07)", borderRadius: 10 }}>
          <small>{p.principle_type}</small><strong style={{ display: "block" }}>{p.title}</strong><span className="muted">{p.description}</span>
          <div style={{ marginTop: 8 }}><button onClick={() => send({ action: "principle-update", id: p.id, active: !p.active })}>{p.active ? "Deactivate" : "Activate"}</button></div>
        </article>)}
      </div>
      <form onSubmit={async e => {
        e.preventDefault();
        const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
        body.action = "principle";
        if (await send(body)) e.currentTarget.reset();
      }} style={{ display: "grid", gap: 8 }}>
        <select name="principleType"><option>NON_NEGOTIABLE</option><option>VALUE</option><option>SERVICE_STANDARD</option><option>FINANCIAL_PRINCIPLE</option><option>BRAND_STANDARD</option><option>OPERATING_PRINCIPLE</option></select>
        <input name="title" required placeholder="Principle title" />
        <textarea name="description" placeholder="What does this require in practice?" />
        <input name="priority" type="number" defaultValue="100" />
        <button className="newAction" type="submit">Add principle</button>
      </form>
    </section>}

    {tab === "priorities" && <section className="adminPanel" style={{ padding: 18 }}>
      <h2>Strategic priorities</h2>
      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {priorities.map((p: any) => <article key={p.id} style={{ padding: 11, border: "1px solid rgba(255,255,255,.07)", borderRadius: 10 }}>
          <small>{p.status} · weight {p.weight}</small><strong style={{ display: "block" }}>{p.title}</strong><span className="muted">{p.description}</span>
          {p.success_metric && <small style={{ display: "block", marginTop: 6 }}>Success: {p.success_metric}{p.target_value != null ? " · target " + p.target_value : ""}</small>}
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {["ACTIVE", "PAUSED", "COMPLETE"].map(s => <button key={s} onClick={() => send({ action: "priority-update", id: p.id, status: s })}>{s}</button>)}
          </div>
        </article>)}
      </div>
      <form onSubmit={async e => {
        e.preventDefault();
        const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
        body.action = "priority";
        if (await send(body)) e.currentTarget.reset();
      }} style={{ display: "grid", gap: 8 }}>
        <input name="title" required placeholder="Strategic priority" />
        <textarea name="description" placeholder="Why this matters" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <input name="weight" type="number" min="1" max="100" defaultValue="10" placeholder="Weight" />
          <input name="priority" type="number" defaultValue="100" placeholder="Order" />
          <select name="status"><option>ACTIVE</option><option>PLANNED</option><option>PAUSED</option></select>
        </div>
        <input name="successMetric" placeholder="Success metric" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <input name="targetValue" inputMode="decimal" placeholder="Target value" />
          <input name="currentValue" inputMode="decimal" placeholder="Current value" />
          <input name="targetDate" type="date" />
        </div>
        <select name="ownerSubject" defaultValue=""><option value="">No owner assigned</option>{data.users.map((u: any) => <option key={u.auth_user_id} value={u.auth_user_id}>{u.display_name || u.email}</option>)}</select>
        <button className="newAction" type="submit">Add strategic priority</button>
      </form>
    </section>}

    {tab === "criteria" && <section className="adminPanel" style={{ padding: 18 }}>
      <h2>Decision criteria</h2>
      <p className="muted">These weights make purpose operational. Hard gates represent requirements that a high overall score cannot compensate for.</p>
      <div style={{ display: "grid", gap: 8, margin: "12px 0" }}>
        {criteria.map((c: any) => <article key={c.id} style={{ padding: 11, border: "1px solid rgba(255,255,255,.07)", borderRadius: 10 }}>
          <small>{c.criterion_key} · weight {c.weight}{c.hard_gate ? " · HARD GATE" : ""}</small>
          <strong style={{ display: "block" }}>{c.title}</strong><span className="muted">{c.description}</span>
          {c.hard_gate && <small style={{ display: "block" }}>Minimum hard-gate score: {c.minimum_score}</small>}
        </article>)}
      </div>
      <form onSubmit={async e => {
        e.preventDefault();
        const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
        body.action = "criterion";
        body.hardGate = Boolean(body.hardGate);
        if (await send(body)) e.currentTarget.reset();
      }} style={{ display: "grid", gap: 8 }}>
        <input name="criterionKey" required placeholder="criterion_key" />
        <input name="title" required placeholder="Criterion title" />
        <textarea name="description" placeholder="How should this be judged?" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <input name="weight" type="number" min="1" max="100" defaultValue="10" />
          <input name="minimumScore" type="number" min="0" max="100" defaultValue="0" />
          <input name="priority" type="number" defaultValue="100" />
        </div>
        <label><input name="hardGate" type="checkbox" /> Hard gate / non-compensable requirement</label>
        <button className="newAction" type="submit">Add or update criterion</button>
      </form>
    </section>}

    {tab === "decisions" && <section className="adminPanel" style={{ padding: 18 }}>
      <h2>Purpose Gate</h2>
      <form onSubmit={async e => {
        e.preventDefault();
        const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
        body.action = "evaluation";
        if (await send(body)) e.currentTarget.reset();
      }} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <select name="subjectType"><option>OPPORTUNITY</option><option>PROPOSAL</option><option>AGREEMENT</option><option>PROJECT</option><option>PURCHASE</option><option>HIRE</option><option>VENDOR</option><option>CAMPAIGN</option><option>INITIATIVE</option><option>OTHER</option></select>
        <input name="subjectTitle" required placeholder="What are we deciding?" />
        <textarea name="decisionQuestion" placeholder="Decision question" />
        <textarea name="expectedOutcome" placeholder="What outcome do we expect?" />
        <textarea name="assumptions" placeholder="Key assumptions" />
        <textarea name="tradeoffs" placeholder="What are we giving up or risking?" />
        <button className="newAction" type="submit">Open Purpose Gate</button>
      </form>

      {evaluations.length > 0 && <select value={selectedEvaluation?.id || ""} onChange={e => setEvaluationId(e.target.value)} style={{ marginBottom: 12 }}>
        {evaluations.map((x: any) => <option key={x.id} value={x.id}>{x.subject_title} · {x.status} · {x.weighted_score == null ? "unscored" : Math.round(Number(x.weighted_score)) + "%"}</option>)}
      </select>}

      {selectedEvaluation && <div style={{ display: "grid", gap: 12 }}>
        <article style={{ padding: 14, border: "1px solid rgba(255,255,255,.08)", borderRadius: 12 }}>
          <small>{selectedEvaluation.subject_type} · {selectedEvaluation.status}</small>
          <h3>{selectedEvaluation.subject_title}</h3>
          <strong style={{ fontSize: "1.8rem" }}>{selectedEvaluation.weighted_score == null ? "—" : Math.round(Number(selectedEvaluation.weighted_score)) + "%"}</strong>
          <p>{selectedEvaluation.recommendation}</p>
          {selectedEvaluation.hard_gate_failed && <p><strong>Hard gate failed.</strong></p>}
        </article>

        {scores.map((s: any) => <form key={s.id} onSubmit={async e => {
          e.preventDefault();
          const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
          body.action = "score"; body.evaluationId = selectedEvaluation.id; body.criterionId = s.criterion_id;
          await send(body);
        }} style={{ display: "grid", gap: 7, padding: 12, border: "1px solid rgba(255,255,255,.07)", borderRadius: 10 }}>
          <div><strong>{s.criterion_title}</strong><small style={{ display: "block" }}>weight {s.weight}{s.hard_gate ? " · hard gate minimum " + s.minimum_score : ""}</small></div>
          <input name="score" type="range" min="0" max="100" defaultValue={s.score} />
          <input name="score" type="number" min="0" max="100" defaultValue={s.score} />
          <textarea name="evidence" defaultValue={s.evidence || ""} placeholder="Evidence — why this score?" />
          <textarea name="risk" defaultValue={s.risk || ""} placeholder="Risk" />
          <textarea name="mitigation" defaultValue={s.mitigation || ""} placeholder="Mitigation" />
          <button type="submit">Save criterion</button>
        </form>)}

        <form onSubmit={async e => {
          e.preventDefault();
          const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
          body.action = "evaluation-status"; body.evaluationId = selectedEvaluation.id;
          await send(body);
        }} style={{ display: "grid", gap: 8 }}>
          <select name="status" defaultValue={selectedEvaluation.status === "MISALIGNED" ? "OVERRIDDEN" : selectedEvaluation.status}>
            <option>ALIGNED</option><option>CONDITIONAL</option><option>MISALIGNED</option><option>OVERRIDDEN</option><option>CANCELLED</option>
          </select>
          <textarea name="overrideReason" placeholder="Required when overriding purpose policy" />
          <button className="newAction" type="submit">Record leadership decision</button>
        </form>
      </div>}
    </section>}

    {tab === "learning" && <section className="adminPanel" style={{ padding: 18 }}>
      <h2>Outcome learning</h2>
      <p className="muted">Close the loop: expected result → actual result → lesson → policy recommendation.</p>
      {evaluations.length > 0 && <select value={selectedEvaluation?.id || ""} onChange={e => setEvaluationId(e.target.value)} style={{ margin: "10px 0" }}>
        {evaluations.map((x: any) => <option key={x.id} value={x.id}>{x.subject_title}</option>)}
      </select>}
      {selectedEvaluation && <form onSubmit={async e => {
        e.preventDefault();
        const body: any = Object.fromEntries(new FormData(e.currentTarget).entries());
        body.action = "outcome"; body.evaluationId = selectedEvaluation.id;
        await send(body);
      }} style={{ display: "grid", gap: 8 }}>
        <textarea name="expectedResult" defaultValue={outcome?.expected_result || selectedEvaluation.expected_outcome || ""} placeholder="Expected result" />
        <textarea name="actualResult" defaultValue={outcome?.actual_result || ""} placeholder="What actually happened?" />
        <select name="outcomeStatus" defaultValue={outcome?.outcome_status || "PENDING"}><option>PENDING</option><option>SUCCESS</option><option>PARTIAL</option><option>MISS</option><option>CANCELLED</option></select>
        <input name="financialResult" inputMode="decimal" defaultValue={outcome?.financial_result_cents != null ? Number(outcome.financial_result_cents) / 100 : ""} placeholder="Financial result $" />
        <textarea name="strategicResult" defaultValue={outcome?.strategic_result || ""} placeholder="Strategic result" />
        <textarea name="beneficiaryResult" defaultValue={outcome?.beneficiary_result || ""} placeholder="Effect on the people this business exists to serve" />
        <textarea name="lessons" defaultValue={outcome?.lessons || ""} placeholder="What did we learn?" />
        <textarea name="policyRecommendation" defaultValue={outcome?.policy_recommendation || ""} placeholder="What should WGOS change or recommend next time?" />
        <button className="newAction" type="submit">Record outcome & learning</button>
      </form>}
    </section>}
  </div>;
}

import { NextResponse } from "next/server";
import { requireApiUser, requireApiBrandAdmin } from "../../../../lib/authz";
import {
  savePurposeProfile,
  createPurposePrinciple,
  updatePurposePrinciple,
  createStrategicPriority,
  updateStrategicPriority,
  saveDecisionCriterion,
  createPurposeEvaluation,
  saveEvaluationScore,
  decidePurposeEvaluation,
  savePurposeOutcome,
} from "../../../../lib/purpose-engine";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const brandId = String(body.brandId || "");
    const action = String(body.action || "");
    const actor = String((auth.identity as any).auth_user_id);

    const access = await requireApiBrandAdmin(auth.identity, brandId);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    let row: any;
    switch (action) {
      case "profile": row = await savePurposeProfile({ ...body, actor }); break;
      case "principle": row = await createPurposePrinciple({ ...body, actor }); break;
      case "principle-update": row = await updatePurposePrinciple({ ...body, actor }); break;
      case "priority": row = await createStrategicPriority({ ...body, actor }); break;
      case "priority-update": row = await updateStrategicPriority({ ...body, actor }); break;
      case "criterion": row = await saveDecisionCriterion({ ...body, actor }); break;
      case "evaluation": row = await createPurposeEvaluation({ ...body, actor }); break;
      case "score": row = await saveEvaluationScore({ ...body, actor }); break;
      case "evaluation-status": row = await decidePurposeEvaluation({ ...body, actor }); break;
      case "outcome": row = await savePurposeOutcome({ ...body, actor }); break;
      default: throw new Error("Unknown Purpose Engine action.");
    }

    return NextResponse.json({ ok: true, row });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update Purpose Engine" },
      { status: 400 }
    );
  }
}
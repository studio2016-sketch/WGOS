# Quote & margin: offline retrospective

This is a local scoring tool, not a quote generator or an AI readiness test. It uses only Node's standard library, reads a single supplied local JSON file (if requested) and prints aggregates. It does not contact a provider or read WGOS, environment secrets, or a database. No real jobs ship with it.

```sh
node scripts/evaluate-quote-margin-retrospective.mjs --synthetic
node --test scripts/evaluate-quote-margin-retrospective.test.mjs
node scripts/evaluate-quote-margin-retrospective.mjs --input /private/local/paired-study.json
```

The built-in 20 synthetic pairs test the scorer only. Do not put historical data in git, CI, a ticket, or a hosted app. Build a separately approved, local de-identified cohort (at least 20 unique jobs). Include only opaque study IDs and the measures below, never customer names, live quotes, emails, prices, private scope notes, or production credentials. Keep the source-to-study ID key separately and out of this file.

The exact JSON shape (one row illustrated; supply at least 20 complete rows):
```json
{
  "schemaVersion": 1,
  "cohort": "deidentified-historical",
  "rows": [{
    "id": "job-0001",
    "manual": {
      "workMinutes": 25,
      "reviewMinutes": 5,
      "criticalPricingError": false,
      "criticalScopeError": false
    },
    "assisted": {
      "workMinutes": 13,
      "reviewMinutes": 6,
      "criticalPricingError": false,
      "criticalScopeError": false
    }
  }]
}
```

- Preselect representative jobs and a reference scope/rate card. Run both methods on the same case information; exclude the original final quote from the operator's inputs. Counterbalance workflow order or use independent operators where feasible to reduce carryover. Record actual elapsed work and review (including corrections) separately, in minutes, with up to two decimals. Both are required and positive.
- Have a qualified reviewer assign both true/false labels for each workflow against the same reference and predefined severity rubric. Example critical pricing error: materially wrong total, fee, discount, or margin from the reference. Example critical scope error: material omission/addition of committed equipment, staffing, hours, deliverables, or coverage. Count critical errors even if caught and corrected in review. Unknown or unreviewed is not false; do not fabricate or silently drop pairs. Document incomplete cases and resolve the reasons before a gate decision.
- The time gate uses `(manual total − assisted total) / manual total`, where each total includes its workflow’s work and review minutes. It requires at least 30% saved. The critical-error gate requires zero assisted rows flagged for either category; manual errors are reported separately for context.
- Exit codes: **0** numeric gates pass, **1** input valid but a gate failed, **2** invalid input or usage. Even a historical-mode pass is based on operator-declared inputs, not independent validation, permission to use a provider, or authorization to launch.

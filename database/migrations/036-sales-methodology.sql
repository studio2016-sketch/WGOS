-- WGOS integrated sales methodology: MEDDPICC + Challenger + Sandler + Girard
alter table wgos.deal_command_profiles
 add column if not exists pain_identified text,
 add column if not exists metrics_quantified text,
 add column if not exists paper_process text,
 add column if not exists challenger_insight text,
 add column if not exists reframe_message text,
 add column if not exists discovery_questions text,
 add column if not exists budget_conversation text,
 add column if not exists decision_tension text,
 add column if not exists relationship_plan text,
 add column if not exists referral_path text,
 add column if not exists post_sale_touch_plan text,
 add column if not exists methodology_readiness integer not null default 0;

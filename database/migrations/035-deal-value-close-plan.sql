-- Extend Deal Command Center with value case and mutual close plan
alter table wgos.deal_command_profiles
 add column if not exists desired_outcome text,
 add column if not exists value_case text,
 add column if not exists success_metrics text,
 add column if not exists close_plan text,
 add column if not exists primary_objection text;

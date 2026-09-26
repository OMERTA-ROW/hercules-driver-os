drop policy if exists "allowances readable" on public.ai_plan_allowances;
revoke select on public.ai_plan_allowances from anon, authenticated;
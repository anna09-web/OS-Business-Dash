-- Business OS — Phase 6: enable Supabase Realtime
-- postgres_changes subscriptions only receive events for tables added to
-- the supabase_realtime publication. RLS still governs which rows a given
-- client actually receives, same as any other read.

alter publication supabase_realtime add table public.agent_logs;
alter publication supabase_realtime add table public.approvals;
alter publication supabase_realtime add table public.tasks;

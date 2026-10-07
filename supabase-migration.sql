-- Run once only if your existing database is missing these columns.
alter table public.messages add column if not exists message_type text not null default 'text';
alter table public.messages add column if not exists read_at timestamptz;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists is_online boolean not null default false;
-- Do NOT add public.messages to supabase_realtime here if it is already enabled.

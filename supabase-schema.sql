-- CHATS database upgrade. Safe to run in your existing Supabase SQL Editor.
-- It adds the columns needed by the current app and creates/updates policies.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists last_seen timestamptz default now();

alter table public.messages add column if not exists message_type text not null default 'text';
alter table public.messages add column if not exists file_url text;
alter table public.messages add column if not exists file_name text;
alter table public.messages add column if not exists file_type text;
alter table public.messages add column if not exists file_size bigint;
alter table public.messages add column if not exists read_at timestamptz;

update public.messages set message_type='text' where message_type is null;

create index if not exists messages_sender_receiver_idx on public.messages(sender_id,receiver_id,created_at);
create index if not exists messages_receiver_sender_idx on public.messages(receiver_id,sender_id,created_at);
create index if not exists profiles_last_seen_idx on public.profiles(last_seen);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid()=id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid()=id) with check (auth.uid()=id);

drop policy if exists "messages_select_participants" on public.messages;
create policy "messages_select_participants" on public.messages for select to authenticated using (auth.uid()=sender_id or auth.uid()=receiver_id);
drop policy if exists "messages_insert_sender" on public.messages;
create policy "messages_insert_sender" on public.messages for insert to authenticated with check (auth.uid()=sender_id);
drop policy if exists "messages_update_recipient" on public.messages;
create policy "messages_update_recipient" on public.messages for update to authenticated using (auth.uid()=receiver_id) with check (auth.uid()=receiver_id);

alter table public.messages replica identity full;
-- If messages is already in supabase_realtime, this command may report a duplicate.
-- A duplicate publication entry is harmless; if Supabase reports an error here, skip this line.
alter publication supabase_realtime add table public.messages;

-- Storage bucket for files/profile pictures.
insert into storage.buckets (id,name,public) values ('chat-files','chat-files',true) on conflict (id) do update set public=true;

drop policy if exists "chat_files_select" on storage.objects;
create policy "chat_files_select" on storage.objects for select to public using (bucket_id='chat-files');
drop policy if exists "chat_files_insert" on storage.objects;
create policy "chat_files_insert" on storage.objects for insert to authenticated with check (bucket_id='chat-files');
drop policy if exists "chat_files_update" on storage.objects;
create policy "chat_files_update" on storage.objects for update to authenticated using (bucket_id='chat-files') with check (bucket_id='chat-files');

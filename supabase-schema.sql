-- CHATS storage + schema upgrade. Safe for the existing CHATS database.
-- Do NOT add public.messages to supabase_realtime again if it is already there.

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

-- Storage bucket used for images, files, profile pictures and voice messages.
insert into storage.buckets (id,name,public)
values ('chat-files','chat-files',true)
on conflict (id) do update set public=true;

drop policy if exists "chat_files_select" on storage.objects;
create policy "chat_files_select" on storage.objects
for select to public using (bucket_id='chat-files');

drop policy if exists "chat_files_insert" on storage.objects;
create policy "chat_files_insert" on storage.objects
for insert to authenticated with check (bucket_id='chat-files');

drop policy if exists "chat_files_update" on storage.objects;
create policy "chat_files_update" on storage.objects
for update to authenticated using (bucket_id='chat-files') with check (bucket_id='chat-files');

drop policy if exists "chat_files_delete" on storage.objects;
create policy "chat_files_delete" on storage.objects
for delete to authenticated using (bucket_id='chat-files');

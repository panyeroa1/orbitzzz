-- Table: transcriptions
create table if not exists public.transcriptions (
  id uuid primary key default gen_random_uuid(),
  meeting_id text not null,
  chunk_index integer not null,          -- incremental per meeting
  text_original text not null,
  source_language text,                  -- from Deepgram (e.g. "en")
  speaker_label text,                    -- e.g. "speaker_0" if you want diarization
  created_at timestamptz not null default now()
);

-- Index for fast meeting lookup
create index if not exists idx_transcriptions_meeting_created
  on public.transcriptions (meeting_id, created_at);

-- Optional: unique per meeting/chunk_index to avoid duplicates
create unique index if not exists idx_transcriptions_meeting_chunk
  on public.transcriptions (meeting_id, chunk_index);

-- Enable RLS
alter table public.transcriptions enable row level security;

-- Allow anon (public) users to insert transcriptions
create policy "Allow anon insert"
  on public.transcriptions
  for insert
  with check (true);

-- Allow anon (public) users to view transcriptions
create policy "Allow anon select"
  on public.transcriptions
  for select
  using (true);

-- Table: eburon_tts_current (for live transcription/translation)
create table if not exists public.eburon_tts_current (
  id uuid not null default gen_random_uuid(),
  client_id text not null,
  source_text text not null,
  source_lang_code text null,
  translated_text text null,  -- Store translation in same row
  updated_at timestamp with time zone not null default now(),
  constraint eburon_tts_current_pkey primary key (id),
  constraint eburon_tts_current_client_id_key unique (client_id)  -- UNIQUE for upsert
);

-- Index for fast client lookup
create index if not exists idx_eburon_tts_client
  on public.eburon_tts_current using btree (client_id, updated_at desc);

-- Enable RLS
alter table public.eburon_tts_current enable row level security;

-- Allow anon users to insert
create policy "Allow anon insert eburon_tts"
  on public.eburon_tts_current
  for insert
  with check (true);

-- Allow anon users to update (for saving translations)
create policy "Allow anon update eburon_tts"
  on public.eburon_tts_current
  for update
  using (true);

-- Allow anon users to select
create policy "Allow anon select eburon_tts"
  on public.eburon_tts_current
  for select
  using (true);

create table public.transcripts (
  id uuid not null default gen_random_uuid (),
  session_id text not null,
  user_id text not null,
  source_language text null default 'auto'::text,
  full_transcript_text text null default ''::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  meeting_id text null,
  constraint transcripts_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_transcripts_session on public.transcripts using btree (session_id) TABLESPACE pg_default;

-- Table: users (synced from Clerk)
create table if not exists public.users (
  id text primary key, -- Use Clerk User ID (string) as PK
  email text not null,
  first_name text,
  last_name text,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS for users
alter table public.users enable row level security;

-- Policy: Allow service role (server) full access, or public read
create policy "Allow public read users" on public.users for select using (true);
create policy "Allow service role full access users" on public.users using (true) with check (true);

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
  translated_text text null,  -- NEW: Store translation in same row
  updated_at timestamp with time zone not null default now(),
  constraint eburon_tts_current_pkey primary key (id)
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

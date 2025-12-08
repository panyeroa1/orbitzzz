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

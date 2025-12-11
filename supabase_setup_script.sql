-- ============================================
-- Supabase Setup Script for Transcription & Translation
-- ============================================
-- This script creates all necessary tables, indexes, and policies
-- for the Eburon transcription and translation system.
--
-- Instructions:
-- 1. Open your Supabase project at https://bridhpobwsfttwalwhih.supabase.co
-- 2. Go to the SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- ============================================

-- ============================================
-- TABLE 1: transcriptions
-- ============================================
-- Stores real-time transcriptions from meetings
-- Each chunk represents a piece of transcribed audio

CREATE TABLE IF NOT EXISTS public.transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id text NOT NULL,
  chunk_index integer NOT NULL,          -- incremental per meeting
  text_original text NOT NULL,
  source_language text,                  -- from Deepgram (e.g. "en")
  speaker_label text,                    -- e.g. "speaker_0" if you want diarization
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE 1.5: transcripts (User Requested Schema)
-- ============================================
-- Stores formatted transcripts with speaker detection labels
-- Used by broadcaster.html
--
CREATE TABLE IF NOT EXISTS public.transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  session_id text NOT NULL,
  user_id text NOT NULL,
  source_language text null default 'auto'::text,
  full_transcript_text text null default ''::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  meeting_id text null,
  constraint transcripts_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_transcripts_session on public.transcripts using btree (session_id) TABLESPACE pg_default;
create index IF not exists idx_transcripts_meeting on public.transcripts using btree (meeting_id) TABLESPACE pg_default;

-- Enable Row Level Security and allow anon
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

create policy if not exists "Allow anon insert transcripts"
  on public.transcripts
  for insert
  with check (true);

create policy if not exists "Allow anon select transcripts"
  on public.transcripts
  for select
  using (true);

create policy if not exists "Allow anon update transcripts"
  on public.transcripts
  for update
  using (true);


-- Index for fast meeting lookup
CREATE INDEX IF NOT EXISTS idx_transcriptions_meeting_created
  ON public.transcriptions (meeting_id, created_at);

-- Optional: unique per meeting/chunk_index to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_transcriptions_meeting_chunk
  ON public.transcriptions (meeting_id, chunk_index);

-- Enable Row Level Security
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

-- Allow anon (public) users to insert transcriptions
CREATE POLICY "Allow anon insert"
  ON public.transcriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow anon (public) users to view transcriptions
CREATE POLICY "Allow anon select"
  ON public.transcriptions
  FOR SELECT
  USING (true);

-- ============================================
-- TABLE 2: eburon_tts_current
-- ============================================
-- Stores current live transcription/translation state
-- Used for real-time translation and text-to-speech

CREATE TABLE IF NOT EXISTS public.eburon_tts_current (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  source_text text NOT NULL,
  source_lang_code text NULL,
  translated_text text NULL,              -- Store translation in same row
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT eburon_tts_current_pkey PRIMARY KEY (id),
  CONSTRAINT eburon_tts_current_client_id_key UNIQUE (client_id)  -- UNIQUE for upsert
);

-- Index for fast client lookup
CREATE INDEX IF NOT EXISTS idx_eburon_tts_client
  ON public.eburon_tts_current USING btree (client_id, updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.eburon_tts_current ENABLE ROW LEVEL SECURITY;

-- Allow anon users to insert
CREATE POLICY "Allow anon insert eburon_tts"
  ON public.eburon_tts_current
  FOR INSERT
  WITH CHECK (true);

-- Allow anon users to update (for saving translations)
CREATE POLICY "Allow anon update eburon_tts"
  ON public.eburon_tts_current
  FOR UPDATE
  USING (true);

-- Allow anon users to select
CREATE POLICY "Allow anon select eburon_tts"
  ON public.eburon_tts_current
  FOR SELECT
  USING (true);

-- ============================================
-- Enable Realtime (for live updates)
-- ============================================
-- This enables realtime subscriptions for the translator

ALTER PUBLICATION supabase_realtime ADD TABLE public.transcriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.eburon_tts_current;

-- ============================================
-- Verification Queries
-- ============================================
-- Run these after the setup to verify everything is working:

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('transcriptions', 'eburon_tts_current');

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('transcriptions', 'eburon_tts_current');

-- Check policies
-- SELECT * FROM pg_policies 
-- WHERE tablename IN ('transcriptions', 'eburon_tts_current');

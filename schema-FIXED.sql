-- ============================================================
-- SENTINEL FORENSIC PLATFORM — FIXED SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Drop and recreate investigations with correct column types
-- NOTE: Only run the DROP if you are OK clearing existing data.
-- If you want to keep data, skip to the ALTER TABLE section below.

-- ── Option A: Fresh start (drops all data) ──────────────────
DROP TABLE IF EXISTS public.generated_reports CASCADE;
DROP TABLE IF EXISTS public.investigation_chat_messages CASCADE;
DROP TABLE IF EXISTS public.investigation_chat_sessions CASCADE;
DROP TABLE IF EXISTS public.relationship_links CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.forensic_records CASCADE;
DROP TABLE IF EXISTS public.investigations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'investigator', 'analyst')) DEFAULT 'analyst',
    badge_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── Investigations (FIXED: TEXT columns for large JSON) ─────
CREATE TABLE IF NOT EXISTS public.investigations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL DEFAULT 'CDR Analysis',
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending', 'archived')),
    risk_score INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES public.profiles(id),
    summary TEXT,
    total_records INTEGER DEFAULT 0,
    -- All JSON stored as TEXT (not JSONB) so n8n string values insert cleanly
    records_json TEXT DEFAULT '[]',
    timeline_json TEXT DEFAULT '[]',
    geo_json TEXT DEFAULT '[]',
    analysis_json TEXT DEFAULT '{}',
    ai_context TEXT DEFAULT '{}',
    metadata TEXT DEFAULT '{}',
    chat_memory TEXT DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── Forensic Records ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.forensic_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    cdr_no TEXT,
    a_party TEXT,
    b_party TEXT,
    imei TEXT,
    imsi TEXT,
    call_type TEXT,
    duration INTEGER,
    timestamp TIMESTAMPTZ,
    first_cell_id TEXT,
    last_cell_id TEXT,
    tower_address TEXT,
    latitude DOUBLE PRECISION DEFAULT 0,
    longitude DOUBLE PRECISION DEFAULT 0,
    operator TEXT,
    roaming BOOLEAN DEFAULT false,
    location_link TEXT,
    risk_score INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── AI Insights ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    insight_type TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    generated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── Relationship Links ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relationship_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    relation_strength INTEGER DEFAULT 1,
    interaction_count INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── Chat Sessions & Messages ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investigation_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.investigation_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.investigation_chat_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── Generated Reports ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    report_type TEXT,
    content TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_investigations_case ON public.investigations(case_number);
CREATE INDEX IF NOT EXISTS idx_records_investigation ON public.forensic_records(investigation_id);
CREATE INDEX IF NOT EXISTS idx_records_a_party ON public.forensic_records(a_party);
CREATE INDEX IF NOT EXISTS idx_links_investigation ON public.relationship_links(investigation_id);
CREATE INDEX IF NOT EXISTS idx_insights_investigation ON public.ai_insights(investigation_id);

-- ── RLS (Row Level Security) ─────────────────────────────────
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forensic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_chat_messages ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Add service_role bypass so n8n (using service key) can always write
-- The anon policies below are for frontend reads
CREATE POLICY "service_role full access investigations"
  ON public.investigations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon read investigations"
  ON public.investigations FOR SELECT TO anon USING (true);

CREATE POLICY "authenticated full access investigations"
  ON public.investigations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access forensic_records"
  ON public.forensic_records FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access forensic_records"
  ON public.forensic_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon read forensic_records"
  ON public.forensic_records FOR SELECT TO anon USING (true);

CREATE POLICY "service_role full access ai_insights"
  ON public.ai_insights FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access ai_insights"
  ON public.ai_insights FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access relationship_links"
  ON public.relationship_links FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access relationship_links"
  ON public.relationship_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access chat_sessions"
  ON public.investigation_chat_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access chat_sessions"
  ON public.investigation_chat_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access chat_messages"
  ON public.investigation_chat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated full access chat_messages"
  ON public.investigation_chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.investigations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.investigations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

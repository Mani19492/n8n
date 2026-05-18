-- Enterprise-Grade Forensic Intelligence Schema
-- Platform: Supabase / PostgreSQL

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'investigator', 'analyst')) DEFAULT 'analyst',
    badge_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Investigations
CREATE TABLE IF NOT EXISTS public.investigations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending', 'archived')),
    risk_score INTEGER DEFAULT 0,
    uploaded_by UUID REFERENCES public.profiles(id),
    summary TEXT,
    total_records INTEGER DEFAULT 0,
    metadata JSONB,
    ai_context TEXT,
    analysis_json TEXT,
    records_json TEXT,
    timeline_json TEXT,
    geo_json TEXT,
    chat_memory TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Forensic Records (Unified CDR/IPDR/Tower Dump)
CREATE TABLE IF NOT EXISTS public.forensic_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    cdr_no TEXT,
    a_party TEXT NOT NULL,
    b_party TEXT,
    imei TEXT,
    imsi TEXT,
    call_type TEXT,
    duration INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    first_cell_id TEXT,
    last_cell_id TEXT,
    tower_address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    operator TEXT,
    roaming BOOLEAN DEFAULT false,
    location_link TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. AI Insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    insight_type TEXT, -- e.g., 'IMEI_CONFLICT', 'GEO_ANOMALY'
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT,
    evidence_records UUID[], -- Array of forensic_record IDs
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Relationship Links (For Graph Engine)
CREATE TABLE IF NOT EXISTS public.relationship_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    source TEXT NOT NULL, -- MSISDN or IMEI
    target TEXT NOT NULL, -- MSISDN or IMEI
    relation_strength INTEGER DEFAULT 1,
    interaction_count INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Investigation Chat Sessions
CREATE TABLE IF NOT EXISTS public.investigation_chat_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 7. Investigation Chat Messages
CREATE TABLE IF NOT EXISTS public.investigation_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.investigation_chat_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Generated Reports
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investigation_id UUID REFERENCES public.investigations(id) ON DELETE CASCADE,
    report_type TEXT,
    content JSONB,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indices for performance
CREATE INDEX idx_records_investigation ON public.forensic_records(investigation_id);
CREATE INDEX idx_records_a_party ON public.forensic_records(a_party);
CREATE INDEX idx_records_b_party ON public.forensic_records(b_party);
CREATE INDEX idx_links_investigation ON public.relationship_links(investigation_id);
CREATE INDEX idx_insights_investigation ON public.ai_insights(investigation_id);

-- RLS
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forensic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for dev)
CREATE POLICY "Full access to authenticated users" ON public.investigations FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to forensic records" ON public.forensic_records FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to ai insights" ON public.ai_insights FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to relationship links" ON public.relationship_links FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to chat sessions" ON public.investigation_chat_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to chat messages" ON public.investigation_chat_messages FOR ALL TO authenticated USING (true);

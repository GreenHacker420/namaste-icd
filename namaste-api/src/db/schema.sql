-- NAMASTE-ICD Database Schema
-- PostgreSQL 15+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- NAMASTE Codes Table
CREATE TABLE IF NOT EXISTS namaste_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL,
  system VARCHAR(20) NOT NULL CHECK (system IN ('ayurveda', 'siddha', 'unani')),
  term TEXT NOT NULL,
  term_normalized TEXT,
  native_script TEXT,
  short_definition TEXT,
  long_definition TEXT,
  english_name TEXT,
  searchable_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(code, system)
);

-- ICD-11 TM2 Codes Table
CREATE TABLE IF NOT EXISTS tm2_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  definition TEXT,
  category VARCHAR(100),
  parent_code VARCHAR(20),
  synonyms TEXT[],
  inclusions TEXT[],
  exclusions TEXT[],
  traditional_systems TEXT[],  -- ayurveda, siddha, unani terms
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mappings Table (NAMASTE <-> TM2)
CREATE TABLE IF NOT EXISTS mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  namaste_code VARCHAR(20) NOT NULL,
  namaste_system VARCHAR(20) NOT NULL,
  tm2_code VARCHAR(20) NOT NULL,
  equivalence VARCHAR(20) NOT NULL CHECK (equivalence IN (
    'equivalent', 'wider', 'narrower', 'inexact', 'unmatched', 'disjoint'
  )),
  confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  mapping_source VARCHAR(50) NOT NULL CHECK (mapping_source IN (
    'deterministic', 'semantic', 'ai_validated', 'human_validated'
  )),
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN (
    'pending', 'approved', 'rejected', 'needs_review'
  )),
  validated_by VARCHAR(100),
  validated_at TIMESTAMPTZ,
  reasoning TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(namaste_code, namaste_system, tm2_code)
);

-- Embeddings Table (for vector search)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('namaste', 'tm2')),
  source_code VARCHAR(20) NOT NULL,
  source_system VARCHAR(20),
  embedding VECTOR(768),  -- Vertex AI embedding dimension
  model_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  user_id VARCHAR(100),
  request_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  request_body JSONB,
  response_status INTEGER,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_namaste_codes_code ON namaste_codes(code);
CREATE INDEX IF NOT EXISTS idx_namaste_codes_system ON namaste_codes(system);
CREATE INDEX IF NOT EXISTS idx_namaste_codes_term_trgm ON namaste_codes USING gin(term gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_namaste_codes_searchable_trgm ON namaste_codes USING gin(searchable_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tm2_codes_code ON tm2_codes(code);
CREATE INDEX IF NOT EXISTS idx_tm2_codes_category ON tm2_codes(category);
CREATE INDEX IF NOT EXISTS idx_tm2_codes_title_trgm ON tm2_codes USING gin(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_mappings_namaste ON mappings(namaste_code, namaste_system);
CREATE INDEX IF NOT EXISTS idx_mappings_tm2 ON mappings(tm2_code);
CREATE INDEX IF NOT EXISTS idx_mappings_confidence ON mappings(confidence DESC);

CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_code);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DROP TRIGGER IF EXISTS namaste_codes_updated_at ON namaste_codes;
CREATE TRIGGER namaste_codes_updated_at
  BEFORE UPDATE ON namaste_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tm2_codes_updated_at ON tm2_codes;
CREATE TRIGGER tm2_codes_updated_at
  BEFORE UPDATE ON tm2_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS mappings_updated_at ON mappings;
CREATE TRIGGER mappings_updated_at
  BEFORE UPDATE ON mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

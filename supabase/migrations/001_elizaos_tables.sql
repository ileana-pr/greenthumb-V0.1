-- ElizaOS Tables for GreenThumb Agent
-- This migration creates the core tables needed for the agent runtime

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Agents Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt TEXT,
  bio TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on agent name for lookups
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);

-- ============================================================================
-- Memories Table (for conversation history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_memories_room_id ON memories(room_id);
CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_room_created ON memories(room_id, created_at DESC);

-- ============================================================================
-- Knowledge Table (for RAG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-ada-002 dimension
  chunk_index INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for knowledge retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_agent_id ON knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_document_id ON knowledge(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge(category);

-- Create a GIN index on tags for efficient array searches
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge USING GIN(tags);

-- Create an IVFFlat index for vector similarity search (faster for large datasets)
-- Note: You may need to rebuild this after inserting data for optimal performance
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);

-- ============================================================================
-- Function: Match Knowledge (Vector Similarity Search)
-- ============================================================================

CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  document_id TEXT,
  title TEXT,
  content TEXT,
  category TEXT,
  tags TEXT[],
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.agent_id,
    k.document_id,
    k.title,
    k.content,
    k.category,
    k.tags,
    k.metadata,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge k
  WHERE 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Function: Match Knowledge for Agent (Agent-Specific Search)
-- ============================================================================

CREATE OR REPLACE FUNCTION match_knowledge_for_agent(
  p_agent_id UUID,
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id TEXT,
  title TEXT,
  content TEXT,
  category TEXT,
  tags TEXT[],
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.document_id,
    k.title,
    k.content,
    k.category,
    k.tags,
    k.metadata,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM knowledge k
  WHERE k.agent_id = p_agent_id
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================================
-- Rooms Table (optional - for tracking conversation rooms)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT DEFAULT 'dm',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_agent_id ON rooms(agent_id);

-- ============================================================================
-- Entities Table (optional - for tracking users/entities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT DEFAULT 'user',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Trigger: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to agents table
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to rooms table
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on tables (you can customize these based on your auth needs)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role has full access to agents" ON agents
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to memories" ON memories
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to knowledge" ON knowledge
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to rooms" ON rooms
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to entities" ON entities
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anon/authenticated users to read agents (public)
CREATE POLICY "Anyone can read agents" ON agents
  FOR SELECT USING (true);

-- Allow anon/authenticated users to read their own memories
-- Note: This assumes entity_id matches the user's JWT sub claim
CREATE POLICY "Users can read their own memories" ON memories
  FOR SELECT USING (
    auth.role() = 'service_role' OR 
    entity_id::text = auth.jwt()->>'sub'
  );

-- Allow users to insert their own memories
CREATE POLICY "Users can insert their own memories" ON memories
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role' OR 
    entity_id::text = auth.jwt()->>'sub'
  );

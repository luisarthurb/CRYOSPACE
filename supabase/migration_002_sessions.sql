-- ============================================================
-- CryoSpace Phase 2 — Sessions, Tokens, Logs
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ========================
-- 1. SESSIONS
-- ========================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
  gm_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'paused', 'ended')),
  fog_state JSONB NOT NULL DEFAULT '{}',
  initiative_order JSONB NOT NULL DEFAULT '[]',
  current_turn INT NOT NULL DEFAULT 0,
  round_number INT NOT NULL DEFAULT 1,
  settings JSONB NOT NULL DEFAULT '{"grid_movement": true, "fog_enabled": true, "partial_failures": false}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- 2. SESSION TOKENS
-- ========================
CREATE TABLE IF NOT EXISTS session_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL,
  bestiary_id UUID REFERENCES bestiary(id) ON DELETE SET NULL,
  label TEXT NOT NULL DEFAULT 'Token',
  x INT NOT NULL DEFAULT 0,
  y INT NOT NULL DEFAULT 0,
  hp INT NOT NULL DEFAULT 20,
  max_hp INT NOT NULL DEFAULT 20,
  ac INT NOT NULL DEFAULT 10,
  speed INT NOT NULL DEFAULT 6,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_npc BOOLEAN NOT NULL DEFAULT false,
  token_color TEXT NOT NULL DEFAULT '#7c3aed',
  conditions JSONB NOT NULL DEFAULT '[]',
  stats JSONB NOT NULL DEFAULT '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- 3. SESSION LOGS
-- ========================
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'chat' CHECK (type IN ('chat', 'action', 'dice', 'combat', 'system', 'narrative')),
  content TEXT NOT NULL,
  roll_result JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- 4. ENABLE RLS
-- ========================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

-- ========================
-- 5. POLICIES
-- ========================

-- Sessions: GM full control
CREATE POLICY "GMs can manage their sessions" ON sessions FOR ALL
  USING (auth.uid() = gm_id);

-- Sessions: Players can view sessions in their campaigns
CREATE POLICY "Players can view sessions in their campaigns" ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_players
      WHERE campaign_players.campaign_id = sessions.campaign_id
      AND campaign_players.user_id = auth.uid()
    )
  );

-- Tokens: GM full control
CREATE POLICY "GMs can manage tokens" ON session_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_tokens.session_id
      AND sessions.gm_id = auth.uid()
    )
  );

-- Tokens: Players can view visible tokens
CREATE POLICY "Players can view visible tokens" ON session_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaign_players cp ON cp.campaign_id = s.campaign_id
      WHERE s.id = session_tokens.session_id
      AND cp.user_id = auth.uid()
    )
  );

-- Tokens: Players can move their own token
CREATE POLICY "Players can move their own token" ON session_tokens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = session_tokens.character_id
      AND characters.owner_id = auth.uid()
    )
  );

-- Logs: GM full control
CREATE POLICY "GMs can manage logs" ON session_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_logs.session_id
      AND sessions.gm_id = auth.uid()
    )
  );

-- Logs: Players can view and insert logs
CREATE POLICY "Players can view session logs" ON session_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaign_players cp ON cp.campaign_id = s.campaign_id
      WHERE s.id = session_logs.session_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Players can insert session logs" ON session_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN campaign_players cp ON cp.campaign_id = s.campaign_id
      WHERE s.id = session_logs.session_id
      AND cp.user_id = auth.uid()
    )
  );

-- ========================
-- 6. TRIGGERS
-- ========================
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

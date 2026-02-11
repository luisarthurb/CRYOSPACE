-- ============================================================
-- CryoSpace Database Schema — Phase 1
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
-- STEP 1: Create all tables first (no cross-references in policies)
-- STEP 2: Enable RLS on all tables
-- STEP 3: Create all policies (safe because all tables exist)
-- STEP 4: Triggers and functions

-- ========================
-- STEP 1: TABLES
-- ========================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  discord_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  race TEXT NOT NULL DEFAULT 'Human',
  class TEXT NOT NULL DEFAULT 'Warrior',
  background TEXT DEFAULT '',
  personality TEXT DEFAULT '',
  dream TEXT DEFAULT '',
  portrait_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gm_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  world_lore TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'spectator')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS campaign_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  hp INT NOT NULL DEFAULT 20,
  max_hp INT NOT NULL DEFAULT 20,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  skills JSONB NOT NULL DEFAULT '[]',
  inventory JSONB NOT NULL DEFAULT '[]',
  equipment JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  traumas JSONB NOT NULL DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(character_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'neutral',
  alignment TEXT DEFAULT 'neutral',
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  portrait_url TEXT,
  stats JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bestiary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'monster',
  hp INT NOT NULL DEFAULT 10,
  stats JSONB NOT NULL DEFAULT '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}',
  xp_reward INT NOT NULL DEFAULT 50,
  loot JSONB NOT NULL DEFAULT '[]',
  description TEXT DEFAULT '',
  portrait_url TEXT,
  challenge_rating REAL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'misc' CHECK (type IN ('weapon', 'armor', 'consumable', 'quest', 'misc')),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  description TEXT DEFAULT '',
  stats JSONB NOT NULL DEFAULT '{}',
  value INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  arc_id UUID REFERENCES arcs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed')),
  rewards TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Map',
  grid_data JSONB NOT NULL DEFAULT '[]',
  theme TEXT NOT NULL DEFAULT 'dungeon',
  config JSONB NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- STEP 2: ENABLE RLS
-- ========================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE arcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bestiary ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

-- ========================
-- STEP 3: POLICIES
-- ========================

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Characters
CREATE POLICY "Users can view their own characters" ON characters FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create characters" ON characters FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own characters" ON characters FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own characters" ON characters FOR DELETE USING (auth.uid() = owner_id);

-- Campaigns
CREATE POLICY "GMs can do everything with their campaigns" ON campaigns FOR ALL USING (auth.uid() = gm_id);
CREATE POLICY "Players can view campaigns they are in" ON campaigns FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = campaigns.id AND campaign_players.user_id = auth.uid())
);

-- Campaign Players
CREATE POLICY "GMs can manage players in their campaigns" ON campaign_players FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_players.campaign_id AND campaigns.gm_id = auth.uid())
);
CREATE POLICY "Players can view their own membership" ON campaign_players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Players can join campaigns" ON campaign_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can leave campaigns" ON campaign_players FOR DELETE USING (auth.uid() = user_id);

-- Campaign States
CREATE POLICY "GMs can manage all states in their campaigns" ON campaign_states FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_states.campaign_id AND campaigns.gm_id = auth.uid())
);
CREATE POLICY "Players can view their own state" ON campaign_states FOR SELECT USING (
  EXISTS (SELECT 1 FROM characters WHERE characters.id = campaign_states.character_id AND characters.owner_id = auth.uid())
);

-- Arcs
CREATE POLICY "GMs can manage arcs" ON arcs FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = arcs.campaign_id AND campaigns.gm_id = auth.uid())
);
CREATE POLICY "Players can view arcs in their campaigns" ON arcs FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = arcs.campaign_id AND campaign_players.user_id = auth.uid())
);

-- NPCs
CREATE POLICY "GMs can manage NPCs" ON npcs FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = npcs.campaign_id AND campaigns.gm_id = auth.uid())
);
CREATE POLICY "Players can view NPCs in their campaigns" ON npcs FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = npcs.campaign_id AND campaign_players.user_id = auth.uid())
);

-- Bestiary
CREATE POLICY "GMs can manage bestiary" ON bestiary FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = bestiary.campaign_id AND campaigns.gm_id = auth.uid())
);
CREATE POLICY "Players can view bestiary in their campaigns" ON bestiary FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = bestiary.campaign_id AND campaign_players.user_id = auth.uid())
);

-- Items
CREATE POLICY "GMs can manage items" ON items FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = items.campaign_id AND campaigns.gm_id = auth.uid())
);
CREATE POLICY "Players can view items in their campaigns" ON items FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = items.campaign_id AND campaign_players.user_id = auth.uid())
);

-- Quests
CREATE POLICY "GMs can manage quests" ON quests FOR ALL USING (
  EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = quests.campaign_id AND campaigns.gm_id = auth.uid())
);
CREATE POLICY "Players can view quests in their campaigns" ON quests FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = quests.campaign_id AND campaign_players.user_id = auth.uid())
);

-- Maps
CREATE POLICY "Users can manage their own maps" ON maps FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Players can view maps in their campaigns" ON maps FOR SELECT USING (
  EXISTS (SELECT 1 FROM campaign_players WHERE campaign_players.campaign_id = maps.campaign_id AND campaign_players.user_id = auth.uid())
);

-- ========================
-- STEP 4: FUNCTIONS & TRIGGERS
-- ========================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaign_states FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON maps FOR EACH ROW EXECUTE FUNCTION update_updated_at();

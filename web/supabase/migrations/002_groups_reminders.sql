-- ============================================================
-- FinanzasYa — Groups, Reminders & WhatsApp Sessions
-- Run after 001_initial.sql
-- ============================================================

-- Add market_widgets column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS market_widgets TEXT[] DEFAULT ARRAY['usd', 'cauciones', 'cedears'];

-- ─── groups ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_individual BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── group_members ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
               CHECK (role IN ('owner', 'admin', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ─── group_invitations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'rejected')),
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── reminders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  amount              DECIMAL(15, 2),
  currency            TEXT DEFAULT 'ARS',
  due_day             INTEGER CHECK (due_day BETWEEN 1 AND 31),
  recurrence          TEXT NOT NULL DEFAULT 'monthly'
                        CHECK (recurrence IN ('monthly', 'yearly', 'one-time')),
  next_due_date       DATE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  notify_whatsapp     BOOLEAN NOT NULL DEFAULT TRUE,
  notify_days_before  INTEGER NOT NULL DEFAULT 3,
  last_notified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── whatsapp_sessions ───────────────────────────────────────
-- Replaces DynamoDB for conversation state management
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  phone        TEXT PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  state        TEXT NOT NULL DEFAULT 'idle',
  pending_data JSONB,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Add group_id to transactions ────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- ─── indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_group_members_user   ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group  ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user       ON reminders (user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_due        ON reminders (next_due_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_transactions_group   ON transactions (group_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions    ON whatsapp_sessions (expires_at);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions   ENABLE ROW LEVEL SECURITY;

-- groups: visible to members
CREATE POLICY "groups_select" ON groups FOR SELECT
  USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

CREATE POLICY "groups_insert" ON groups FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "groups_update" ON groups FOR UPDATE
  USING (id IN (
    SELECT group_id FROM group_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "groups_delete" ON groups FOR DELETE
  USING (id IN (
    SELECT group_id FROM group_members
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- group_members: visible to members of same group
CREATE POLICY "group_members_select" ON group_members FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

CREATE POLICY "group_members_insert" ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR user_id = auth.uid()  -- accepting an invitation
  );

CREATE POLICY "group_members_delete" ON group_members FOR DELETE
  USING (
    user_id = auth.uid()  -- leave group
    OR group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- group_invitations
CREATE POLICY "invitations_select" ON group_invitations FOR SELECT
  USING (
    invited_by = auth.uid()
    OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "invitations_insert" ON group_invitations FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "invitations_update" ON group_invitations FOR UPDATE
  USING (TRUE);  -- token-based acceptance handled in API

-- reminders
CREATE POLICY "reminders_select" ON reminders FOR SELECT
  USING (
    user_id = auth.uid()
    OR group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "reminders_insert" ON reminders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reminders_update" ON reminders FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "reminders_delete" ON reminders FOR DELETE
  USING (user_id = auth.uid());

-- whatsapp_sessions: only service role (bot) + own
CREATE POLICY "whatsapp_sessions_select" ON whatsapp_sessions FOR SELECT
  USING (user_id = auth.uid());

-- ─── Auto-create individual group on user signup ──────────────
CREATE OR REPLACE FUNCTION handle_new_user_group()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_group_id UUID;
BEGIN
  -- Create individual group
  INSERT INTO groups (name, created_by, is_individual)
  VALUES ('Personal', NEW.id, TRUE)
  RETURNING id INTO new_group_id;

  -- Add as owner
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (new_group_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_group ON profiles;
CREATE TRIGGER on_profile_created_group
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_group();

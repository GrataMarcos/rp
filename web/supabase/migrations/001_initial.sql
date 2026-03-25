-- ============================================================
-- FinanzasYa — Initial Schema
-- Run this in your Supabase SQL Editor (or via supabase db push)
-- ============================================================

-- ─── profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  phone_number          TEXT,
  experience_level      TEXT NOT NULL DEFAULT 'basico'
                          CHECK (experience_level IN ('basico', 'intermedio', 'avanzado')),
  default_currency      TEXT NOT NULL DEFAULT 'ARS'
                          CHECK (default_currency IN ('ARS', 'USD', 'EUR')),
  timezone              TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  whatsapp_phone        TEXT,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  emoji        TEXT,
  type         TEXT NOT NULL DEFAULT 'expense'
                 CHECK (type IN ('income', 'expense', 'both')),
  color        TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── accounts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'bank'
                    CHECK (type IN ('cash', 'bank', 'investment', 'other')),
  currency        TEXT NOT NULL DEFAULT 'ARS',
  initial_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── transactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount      DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency    TEXT NOT NULL DEFAULT 'ARS',
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  source      TEXT NOT NULL DEFAULT 'web'
                CHECK (source IN ('web', 'whatsapp', 'import')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── investments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  ticker         TEXT,
  type           TEXT NOT NULL DEFAULT 'other'
                   CHECK (type IN ('stock', 'bond', 'crypto', 'fund', 'cedear', 'plazo_fijo', 'other')),
  quantity       DECIMAL(15, 6) NOT NULL CHECK (quantity > 0),
  purchase_price DECIMAL(15, 2) NOT NULL CHECK (purchase_price >= 0),
  current_price  DECIMAL(15, 2) CHECK (current_price >= 0),
  purchase_date  DATE,
  currency       TEXT NOT NULL DEFAULT 'ARS',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── savings_goals ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  target_amount DECIMAL(15, 2) NOT NULL CHECK (target_amount > 0),
  currency      TEXT NOT NULL DEFAULT 'ARS',
  target_date   DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type
  ON transactions (user_id, type);

CREATE INDEX IF NOT EXISTS idx_transactions_user_currency
  ON transactions (user_id, currency);

CREATE INDEX IF NOT EXISTS idx_investments_user
  ON investments (user_id);

CREATE INDEX IF NOT EXISTS idx_categories_user
  ON categories (user_id);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- profiles: users can only see/edit their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- categories: own rows + service role for whatsapp bot inserts
CREATE POLICY "categories_select" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (auth.uid() = user_id);

-- accounts
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (auth.uid() = user_id);

-- transactions: own rows (web) + service_role for whatsapp bot
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- investments
CREATE POLICY "investments_select" ON investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "investments_insert" ON investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investments_update" ON investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "investments_delete" ON investments FOR DELETE USING (auth.uid() = user_id);

-- savings_goals
CREATE POLICY "savings_goals_select" ON savings_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_insert" ON savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "savings_goals_update" ON savings_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "savings_goals_delete" ON savings_goals FOR DELETE USING (auth.uid() = user_id);

-- ─── WhatsApp bot lookup helper ───────────────────────────────
-- The Lambda uses service_role key → bypasses RLS
-- This view makes it easy to look up user by whatsapp_phone
CREATE OR REPLACE VIEW whatsapp_users AS
  SELECT id, whatsapp_phone, default_currency, experience_level
  FROM profiles
  WHERE whatsapp_phone IS NOT NULL;

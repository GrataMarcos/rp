export type ExperienceLevel = 'basico' | 'intermedio' | 'avanzado'
export type TransactionType = 'income' | 'expense'
export type Currency = 'ARS' | 'USD' | 'EUR'
export type InvestmentType = 'stock' | 'bond' | 'crypto' | 'fund' | 'cedear' | 'plazo_fijo' | 'other'
export type TransactionSource = 'web' | 'whatsapp' | 'import'
export type AccountType = 'cash' | 'bank' | 'investment' | 'other'
export type GroupRole = 'owner' | 'admin' | 'member'
export type InvitationStatus = 'pending' | 'accepted' | 'rejected'
export type ReminderRecurrence = 'monthly' | 'yearly' | 'one-time'
export type MarketWidget = 'usd' | 'cauciones' | 'cedears'

export interface Profile {
  id: string
  full_name: string | null
  phone_number: string | null
  experience_level: ExperienceLevel
  default_currency: Currency
  timezone: string
  whatsapp_phone: string | null
  onboarding_completed: boolean
  market_widgets: MarketWidget[]
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  emoji: string | null
  type: 'income' | 'expense' | 'both'
  color: string | null
  is_default: boolean
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  currency: Currency
  initial_balance: number
  is_active: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  group_id: string | null
  account_id: string | null
  category_id: string | null
  type: TransactionType
  amount: number
  currency: Currency
  description: string | null
  date: string
  source: TransactionSource
  notes: string | null
  created_at: string
  category?: Category | null
  account?: Account | null
  group?: Pick<Group, 'id' | 'name'> | null
}

export interface Investment {
  id: string
  user_id: string
  name: string
  ticker: string | null
  type: InvestmentType
  quantity: number
  purchase_price: number
  current_price: number | null
  purchase_date: string | null
  currency: Currency
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SavingsGoal {
  id: string
  user_id: string
  name: string
  target_amount: number
  currency: Currency
  target_date: string | null
  is_active: boolean
  created_at: string
}

// Groups
export interface Group {
  id: string
  name: string
  description: string | null
  created_by: string | null
  is_individual: boolean
  created_at: string
  members?: GroupMember[]
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
  profile?: Pick<Profile, 'id' | 'full_name' | 'whatsapp_phone'>
}

export interface GroupInvitation {
  id: string
  group_id: string
  invited_by: string | null
  email: string
  status: InvitationStatus
  token: string
  expires_at: string
  created_at: string
  group?: Pick<Group, 'id' | 'name'>
  inviter?: Pick<Profile, 'id' | 'full_name'>
}

// Reminders
export interface Reminder {
  id: string
  group_id: string | null
  user_id: string
  title: string
  description: string | null
  amount: number | null
  currency: Currency
  due_day: number | null
  recurrence: ReminderRecurrence
  next_due_date: string | null
  is_active: boolean
  notify_whatsapp: boolean
  notify_days_before: number
  last_notified_at: string | null
  created_at: string
  group?: Pick<Group, 'id' | 'name'> | null
}

// Market data
export interface UsdRates {
  blue: number
  oficial: number
  mep: number
  updated_at: string
}

export interface CaucionRates {
  rate_24h: number
  rate_48h: number
  rate_72h: number
  updated_at: string
}

export interface CedearItem {
  ticker: string
  name: string
  price: number
  change_pct: number
}

export interface MarketData {
  usd?: UsdRates
  cauciones?: CaucionRates
  cedears?: { items: CedearItem[]; updated_at: string }
}

export interface MonthlySummary {
  month: string
  income: number
  expenses: number
  savings: number
}

export interface CategorySummary {
  category_id: string
  name: string
  emoji: string | null
  amount: number
  percentage: number
  count: number
}

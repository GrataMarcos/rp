export type ExperienceLevel = 'basico' | 'intermedio' | 'avanzado'
export type TransactionType = 'income' | 'expense'
export type Currency = 'ARS' | 'USD' | 'EUR'
export type InvestmentType = 'stock' | 'bond' | 'crypto' | 'fund' | 'cedear' | 'plazo_fijo' | 'other'
export type TransactionSource = 'web' | 'whatsapp' | 'import'
export type AccountType = 'cash' | 'bank' | 'investment' | 'other'

export interface Profile {
  id: string
  full_name: string | null
  phone_number: string | null
  experience_level: ExperienceLevel
  default_currency: Currency
  timezone: string
  whatsapp_phone: string | null
  onboarding_completed: boolean
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

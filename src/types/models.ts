// Modelos de datos de la aplicación de finanzas personales

export type MovementType = 'ingreso' | 'gasto'

export type Currency = 'COP' | 'EUR' | 'USD' | 'CHF'

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'COP', label: 'Peso colombiano', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'USD', label: 'Dólar estadounidense', symbol: 'US$' },
  { code: 'CHF', label: 'Franco suizo', symbol: 'CHF' },
]

export type AccountType = 'efectivo' | 'banco' | 'tarjeta_credito'

export interface Account {
  id: string
  nombre: string
  moneda: Currency
  tipo: AccountType
  activa: boolean
  // Solo para tarjetas de crédito
  cupo?: number
  fechaCorte?: number // día del mes, 1-31
  fechaPago?: number // día del mes, 1-31
  diasAvisoPago?: number // días de anticipación para el aviso, default 5
}

export interface IncomeSource {
  id: string
  nombre: string
}

export interface Category {
  id: string
  name: string
  type: MovementType
  icon: string // emoji o símbolo simple
  color: string // hex
  isDefault: boolean
}

export interface Movement {
  id: string
  type: MovementType
  amount: number // siempre positivo, el signo lo da "type"
  categoryId: string
  date: string // ISO yyyy-mm-dd
  description: string
  createdAt: number
  updatedAt: number
  recurringId?: string // si vino de un movimiento recurrente
  accountId?: string // cuenta a la que pertenece (nueva; opcional por compatibilidad con datos viejos)
  sourceId?: string // fuente del ingreso (solo aplica si type === 'ingreso')
}

export type TransferType = 'cambio_moneda' | 'pago_tarjeta' | 'pago_prestamo'

export interface Transfer {
  id: string
  tipo: TransferType
  date: string
  fromAccountId: string
  toAccountId?: string // no aplica si el destino es un préstamo externo
  loanId?: string // si tipo === 'pago_prestamo'
  fromAmount: number
  toAmount: number
  rate: number // toAmount / fromAmount
  note?: string
  createdAt: number
}

export type LoanDirection = 'debo' | 'me_deben'
export type InterestRateType = 'fija' | 'variable'

export interface LoanRateChange {
  date: string
  rate: number // tasa mensual, %
}

export interface Loan {
  id: string
  direction: LoanDirection
  counterpartyName: string
  counterpartyContact?: string
  currency: Currency
  totalAmount: number
  installmentCount: number
  startDate: string
  hasInterest: boolean
  interestRateType?: InterestRateType
  interestRate?: number // tasa mensual inicial, %
  rateHistory?: LoanRateChange[] // cambios posteriores, solo si es variable
  diasAvisoPago: number
  paymentDay?: number // día del mes en que se paga la cuota
  payments: { date: string; amount: number }[] // pagos manuales registrados
  active: boolean
}

export type RecurringFrequency = 'diaria' | 'semanal' | 'mensual' | 'anual'

export interface RecurringMovement {
  id: string
  description: string
  amount: number
  categoryId: string
  type: MovementType
  frequency: RecurringFrequency
  startDate: string // ISO
  lastGeneratedDate?: string // ISO, última fecha para la que ya se generó un movimiento
  active: boolean
}

export interface Budget {
  id: string
  categoryId: string
  month: string // formato "YYYY-MM"
  amount: number
}

export interface AppSettings {
  id: 'settings'
  currency: 'COP'
  onboardingDone: boolean
}

// ---------- Multiusuario (Firebase) ----------

export type UserRole = 'admin' | 'miembro'

export interface UserProfile {
  uid: string
  nombre: string
  correo: string
  rol: UserRole
  activo: boolean
  creadoEn: number
  monedaPreferida?: Currency // para el total combinado de referencia
  novedadesVistas?: number // última versión de "novedades" que ya vio
  ultimaConexion?: number // timestamp de la última vez que abrió la app
}

export interface InviteCode {
  code: string
  createdBy: string
  createdAt: number
  used: boolean
  usedBy?: string
  usedAt?: number
}

export interface BackupData {
  version: number
  exportedAt: string
  movements: Movement[]
  categories: Category[]
  budgets: Budget[]
  recurring: RecurringMovement[]
  settings: AppSettings
  accounts?: Account[]
  incomeSources?: IncomeSource[]
  transfers?: Transfer[]
  loans?: Loan[]
}

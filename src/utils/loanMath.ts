import type { Loan, LoanPayment, LoanStatus } from '../types/models'
import { addMonths, todayISO, nextMonthlyDate } from './date'

export interface InstallmentBreakdown {
  number: number
  date: string
  rate: number // tasa mensual usada, %
  payment: number
  interest: number
  principal: number
  remainingBalance: number
  paid: boolean // si la fecha ya pasó
}

export function rateForDate(loan: Loan, date: string): number {
  if (!loan.hasInterest) return 0
  let rate = loan.interestRate ?? 0
  if (loan.interestRateType === 'variable' && loan.rateHistory) {
    for (const change of [...loan.rateHistory].sort((a, b) => a.date.localeCompare(b.date))) {
      if (change.date <= date) rate = change.rate
    }
  }
  return rate
}

// Cuota fija (sistema francés) cuando hay interés; división simple cuando no lo hay.
function calcInstallmentAmount(principal: number, monthlyRatePct: number, n: number): number {
  if (n <= 0) return 0
  if (!monthlyRatePct) return principal / n
  const i = monthlyRatePct / 100
  const factor = Math.pow(1 + i, n)
  return (principal * i * factor) / (factor - 1)
}

// Genera el plan de amortización completo. Nota: es un ESTIMADO — puede no calzar
// exacto con el extracto del banco por redondeos, seguros o comisiones adicionales.
export function buildAmortizationSchedule(loan: Loan): InstallmentBreakdown[] {
  const schedule: InstallmentBreakdown[] = []
  let balance = loan.totalAmount
  const today = todayISO()

  const cuotas = loan.installmentCount ?? 0
  for (let k = 1; k <= cuotas; k++) {
    const date = addMonths(loan.startDate.slice(0, 7), k) + '-' + loan.startDate.slice(8, 10)
    const rate = rateForDate(loan, date)
    const payment = calcInstallmentAmount(loan.totalAmount, loan.hasInterest ? (loan.interestRate ?? 0) : 0, cuotas)
    const interest = balance * (rate / 100)
    let principal = payment - interest
    if (k === cuotas) principal = balance // ajusta el último para cerrar en cero
    balance = Math.max(0, balance - principal)

    schedule.push({
      number: k,
      date,
      rate,
      payment: interest + principal,
      interest,
      principal,
      remainingBalance: balance,
      paid: date <= today,
    })
  }
  return schedule
}

export interface LoanSummary {
  installmentAmount: number
  installmentsPaid: number
  totalPaidCapital: number
  totalPaidInterest: number
  totalPaid: number
  remainingCapital: number
  nextPaymentDate: string | null
  nextPaymentAmount: number | null
}

export function summarizeLoan(loan: Loan): LoanSummary {
  const schedule = buildAmortizationSchedule(loan)
  const paidInstallments = schedule.filter((s) => s.paid)
  const pendingInstallments = schedule.filter((s) => !s.paid)

  const totalPaidCapital = paidInstallments.reduce((s, x) => s + x.principal, 0)
  const totalPaidInterest = paidInstallments.reduce((s, x) => s + x.interest, 0)
  const remainingCapital = paidInstallments.length > 0
    ? paidInstallments[paidInstallments.length - 1].remainingBalance
    : loan.totalAmount

  return {
    installmentAmount: schedule[0]?.payment ?? 0,
    installmentsPaid: paidInstallments.length,
    totalPaidCapital,
    totalPaidInterest,
    totalPaid: totalPaidCapital + totalPaidInterest,
    remainingCapital,
    nextPaymentDate: pendingInstallments[0]?.date ?? null,
    nextPaymentAmount: pendingInstallments[0]?.payment ?? null,
  }
}

// Días hasta el próximo pago (negativo si ya pasó)
export function daysUntil(dateISO: string): number {
  const today = new Date(todayISO() + 'T00:00:00')
  const target = new Date(dateISO + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ---------- Estado real, calculado con los pagos que la persona registró ----------

export interface LoanTotals {
  capitalPagado: number
  interesPagado: number
  totalPagado: number
  saldo: number // capital que falta
  ultimoPago: LoanPayment | null
  pagosOrdenados: LoanPayment[] // del más reciente al más antiguo
}

export function loanTotals(loan: Loan): LoanTotals {
  const pagos = loan.payments ?? []
  const capitalPagado = pagos.reduce((s, p) => s + (p.capital ?? 0), 0)
  const interesPagado = pagos.reduce((s, p) => s + (p.interest ?? 0), 0)
  const pagosOrdenados = [...pagos].sort((a, b) => b.date.localeCompare(a.date))
  return {
    capitalPagado,
    interesPagado,
    totalPagado: capitalPagado + interesPagado,
    saldo: Math.max(0, loan.totalAmount - capitalPagado),
    ultimoPago: pagosOrdenados[0] ?? null,
    pagosOrdenados,
  }
}

// Estado del préstamo tolerando los registros viejos, que no traen `estado`.
export function loanStatus(loan: Loan): LoanStatus {
  return loan.estado ?? (loan.active ? 'activa' : 'terminada')
}

// Interés que correspondería al saldo de hoy: solo una sugerencia para
// prellenar el reparto — la persona puede cambiarlo o dejarlo en cero.
export function suggestedInterest(loan: Loan, date: string = todayISO()): number {
  if (!loan.hasInterest) return 0
  const { saldo } = loanTotals(loan)
  return saldo * (rateForDate(loan, date) / 100)
}

// Próxima fecha de cuota, solo para los préstamos que sí tienen plan pactado.
export function nextInstallmentDate(loan: Loan, from: string = todayISO()): string | null {
  if (!loan.installmentCount && !loan.paymentDay) return null
  if (loan.paymentDay) return nextMonthlyDate(loan.paymentDay)
  const schedule = buildAmortizationSchedule(loan)
  return schedule.find((s) => s.date > from)?.date ?? null
}

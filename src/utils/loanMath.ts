import type { Loan } from '../types/models'
import { addMonths, todayISO } from './date'

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

function rateForDate(loan: Loan, date: string): number {
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

  for (let k = 1; k <= loan.installmentCount; k++) {
    const date = addMonths(loan.startDate.slice(0, 7), k) + '-' + loan.startDate.slice(8, 10)
    const rate = rateForDate(loan, date)
    const payment = calcInstallmentAmount(loan.totalAmount, loan.hasInterest ? (loan.interestRate ?? 0) : 0, loan.installmentCount)
    const interest = balance * (rate / 100)
    let principal = payment - interest
    if (k === loan.installmentCount) principal = balance // ajusta el último para cerrar en cero
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

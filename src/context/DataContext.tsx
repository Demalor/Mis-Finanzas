import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react'
import { ensureSeeded } from '../firebase/repo'
import * as repo from '../firebase/repo'
import { nextPendingDate } from '../utils/recurring'
import { loanTotals } from '../utils/loanMath'
import { todayISO } from '../utils/date'
import { useAuth } from '../firebase/useAuth'
import { DataContext, type DataContextValue } from './useData'
import type { Movement, Category, Budget, RecurringMovement, Account, IncomeSource, Transfer, Loan, LoanPayment, Project, ProjectEntry, SavingsBox, SavingsBoxEntry } from '../types/models'

// ---- Helpers de estado local: tras cada mutación actualizamos el array en
// memoria en vez de re-descargar las 8 colecciones de Firestore. ----
type Id = { id: string }
const addOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, item: T) =>
  set((prev) => [...prev, item])
const upsertOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, item: T) =>
  set((prev) => (prev.some((x) => x.id === item.id) ? prev.map((x) => (x.id === item.id ? item : x)) : [...prev, item]))
// Ignora las claves `undefined` para reflejar el `ignoreUndefinedProperties`
// de Firestore (un `undefined` en el merge deja el valor anterior intacto).
const patchOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, id: string, changes: Partial<T>) => {
  const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)) as Partial<T>
  set((prev) => prev.map((x) => (x.id === id ? { ...x, ...clean } : x)))
}
const removeOne = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, id: string) =>
  set((prev) => prev.filter((x) => x.id !== id))
const removeMany = <T extends Id>(set: Dispatch<SetStateAction<T[]>>, ids: string[]) => {
  const gone = new Set(ids)
  set((prev) => prev.filter((x) => !gone.has(x.id)))
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.uid ?? null

  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState<Movement[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [recurring, setRecurring] = useState<RecurringMovement[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectEntries, setProjectEntries] = useState<ProjectEntry[]>([])
  const [savingsBoxes, setSavingsBoxes] = useState<SavingsBox[]>([])

  const loadAll = useCallback(async () => {
    if (!userId) return
    const [m, c, b, r, acc, src, trf, ln, prj, pent, cajas] = await Promise.all([
      repo.getAllMovements(userId),
      repo.getAllCategories(userId),
      repo.getAllBudgets(userId),
      repo.getAllRecurring(userId),
      repo.getAllAccounts(userId),
      repo.getAllIncomeSources(userId),
      repo.getAllTransfers(userId),
      repo.getAllLoans(userId),
      repo.getAllProjects(userId),
      repo.getAllProjectEntries(userId),
      repo.getAllSavingsBoxes(userId),
    ])
    setMovements(m)
    setCategories(c)
    setBudgets(b)
    setRecurring(r)
    setAccounts(acc)
    setIncomeSources(src)
    setTransfers(trf)
    setLoans(ln)
    setProjects(prj)
    setProjectEntries(pent)
    setSavingsBoxes(cajas)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      // eslint-disable-next-line react/set-state-in-effect
      setMovements([])
      setCategories([])
      setBudgets([])
      setRecurring([])
      setAccounts([])
      setIncomeSources([])
      setTransfers([])
      setLoans([])
      setProjects([])
      setProjectEntries([])
      setSavingsBoxes([])
      setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      await ensureSeeded(userId)
      try {
        await repo.migrateSavingsBoxes(userId)
      } catch (e) {
        console.error('No se pudieron migrar las cajas de ahorro', e)
      }
      await loadAll()
      setLoading(false)
    })()
  }, [userId, loadAll])

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      movements,
      categories,
      budgets,
      recurring,
      accounts,
      incomeSources,
      transfers,
      loans,
      projects,
      projectEntries,
      savingsBoxes,
      refresh: loadAll,

      addMovement: async (input) => {
        if (!userId) throw new Error('No hay usuario autenticado')
        const movement = await repo.addMovement(userId, input)
        addOne(setMovements, movement)
        return movement
      },
      updateMovement: async (id, changes) => {
        if (!userId) return
        await repo.updateMovement(userId, id, changes)
        patchOne(setMovements, id, { ...changes, updatedAt: Date.now() })
      },
      deleteMovement: async (id) => {
        if (!userId) return
        await repo.deleteMovement(userId, id)
        removeOne(setMovements, id)
      },
      deleteMovements: async (ids) => {
        if (!userId) return
        await repo.deleteMovements(userId, ids)
        removeMany(setMovements, ids)
      },

      addCategory: async (input) => {
        if (!userId) return
        addOne(setCategories, await repo.addCategory(userId, input))
      },
      updateCategory: async (id, changes) => {
        if (!userId) return
        await repo.updateCategory(userId, id, changes)
        patchOne(setCategories, id, changes)
      },
      deleteCategory: async (id) => {
        if (!userId) return
        await repo.deleteCategory(userId, id)
        removeOne(setCategories, id)
      },

      upsertBudget: async (input) => {
        if (!userId) return
        upsertOne(setBudgets, await repo.upsertBudget(userId, input))
      },
      deleteBudget: async (id) => {
        if (!userId) return
        await repo.deleteBudget(userId, id)
        removeOne(setBudgets, id)
      },

      addRecurring: async (input) => {
        if (!userId) return
        addOne(setRecurring, await repo.addRecurring(userId, input))
      },
      updateRecurring: async (id, changes) => {
        if (!userId) return
        await repo.updateRecurring(userId, id, changes)
        patchOne(setRecurring, id, changes)
      },
      deleteRecurring: async (id) => {
        if (!userId) return
        await repo.deleteRecurring(userId, id)
        removeOne(setRecurring, id)
      },
      confirmRecurringPayment: async (recurringId) => {
        if (!userId) return
        const r = recurring.find((x) => x.id === recurringId)
        if (!r) return
        const date = nextPendingDate(r)
        if (!date) return
        const movement = await repo.addMovement(userId, {
          type: r.type,
          amount: r.amount,
          categoryId: r.categoryId,
          date,
          description: r.description,
          recurringId: r.id,
          accountId: r.accountId,
          sourceId: r.type === 'ingreso' ? r.sourceId : undefined,
        })
        addOne(setMovements, movement)
        await repo.updateRecurring(userId, recurringId, { lastGeneratedDate: date })
        patchOne(setRecurring, recurringId, { lastGeneratedDate: date })
      },

      addAccount: async (input) => {
        if (!userId) return
        addOne(setAccounts, await repo.addAccount(userId, input))
      },
      updateAccount: async (id, changes) => {
        if (!userId) return
        await repo.updateAccount(userId, id, changes)
        patchOne(setAccounts, id, changes)
      },
      deleteAccount: async (id) => {
        if (!userId) return
        await repo.deleteAccount(userId, id)
        removeOne(setAccounts, id)
      },

      addIncomeSource: async (input) => {
        if (!userId) return
        addOne(setIncomeSources, await repo.addIncomeSource(userId, input))
      },
      updateIncomeSource: async (id, changes) => {
        if (!userId) return
        await repo.updateIncomeSource(userId, id, changes)
        patchOne(setIncomeSources, id, changes)
      },
      deleteIncomeSource: async (id) => {
        if (!userId) return
        await repo.deleteIncomeSource(userId, id)
        removeOne(setIncomeSources, id)
      },

      addTransfer: async (input) => {
        if (!userId) return
        addOne(setTransfers, await repo.addTransfer(userId, input))
      },
      deleteTransfer: async (id) => {
        if (!userId) return
        await repo.deleteTransfer(userId, id)
        removeOne(setTransfers, id)
      },

      addLoan: async (input) => {
        if (!userId) return
        addOne(setLoans, await repo.addLoan(userId, input))
      },
      updateLoan: async (id, changes) => {
        if (!userId) return
        await repo.updateLoan(userId, id, changes)
        patchOne(setLoans, id, changes)
      },
      addProject: async (input) => {
        if (!userId) return
        addOne(setProjects, await repo.addProject(userId, input))
      },
      updateProject: async (id, changes) => {
        if (!userId) return
        await repo.updateProject(userId, id, changes)
        patchOne(setProjects, id, changes)
      },
      deleteProject: async (id) => {
        if (!userId) return
        await repo.deleteProject(userId, id)
        removeOne(setProjects, id)
        setProjectEntries((prev) => prev.filter((e) => e.projectId !== id))
      },
      addProjectEntry: async (input) => {
        if (!userId) return
        addOne(setProjectEntries, await repo.addProjectEntry(userId, input))
      },
      deleteProjectEntry: async (id) => {
        if (!userId) return
        await repo.deleteProjectEntry(userId, id)
        removeOne(setProjectEntries, id)
      },

      addSavingsBox: async (input) => {
        if (!userId) return
        const nueva: Omit<SavingsBox, 'id'> = {
          name: input.name,
          currency: input.currency,
          target: input.target,
          current: 0,
          history: [],
          createdAt: Date.now(),
        }
        if (input.accountId) nueva.accountId = input.accountId
        addOne(setSavingsBoxes, await repo.addSavingsBox(userId, nueva))
      },
      updateSavingsBox: async (box) => {
        if (!userId) return
        const limpia = { ...box }
        if (!limpia.accountId) delete limpia.accountId
        await repo.saveSavingsBox(userId, limpia)
        upsertOne(setSavingsBoxes, limpia)
      },
      deleteSavingsBox: async (id) => {
        if (!userId) return
        await repo.deleteSavingsBox(userId, id)
        removeOne(setSavingsBoxes, id)
      },
      moveSavingsBox: async (id, delta, originAccountId) => {
        if (!userId) return
        const box = savingsBoxes.find((b) => b.id === id)
        if (!box) return
        // El monto nunca baja de 0, así que al retirar lo realmente aplicado
        // puede ser menor a lo pedido: eso es lo que queda en el historial.
        const current = Math.max(0, box.current + delta)
        const aplicado = current - box.current
        if (aplicado === 0) return
        const entry: SavingsBoxEntry = { date: todayISO(), delta: aplicado }
        const origen = box.accountId ?? originAccountId
        if (origen && aplicado > 0) entry.accountId = origen
        const next: SavingsBox = { ...box, current, history: [...box.history, entry] }
        await repo.saveSavingsBox(userId, next)
        upsertOne(setSavingsBoxes, next)
      },

      deleteLoan: async (id) => {
        if (!userId) return
        await repo.deleteLoan(userId, id)
        removeOne(setLoans, id)
      },
      // Un pago solo crea movimiento si salió de una cuenta real: los abonos
      // en efectivo o los que un tercero paga directamente no tocan cuentas.
      registerLoanPayment: async (loanId, input) => {
        if (!userId) return
        const loan = loans.find((l) => l.id === loanId)
        if (!loan) return

        const { categoryId, ...rest } = input
        const payment: LoanPayment = { ...rest, id: crypto.randomUUID() }

        if (input.accountId && categoryId) {
          const movement = await repo.addMovement(userId, {
            type: loan.direction === 'debo' ? 'gasto' : 'ingreso',
            amount: input.sourceAmount ?? input.amount,
            categoryId,
            date: input.date,
            description: input.note?.trim() || `${loan.direction === 'debo' ? 'Pago a' : 'Cobro a'} ${loan.counterpartyName}`,
            accountId: input.accountId,
            loanId,
          })
          addOne(setMovements, movement)
          payment.movementId = movement.id
        }

        const payments = [...(loan.payments ?? []), payment]
        const saldo = loanTotals({ ...loan, payments }).saldo
        const changes: Partial<Loan> = { payments, ...(saldo <= 0 ? { estado: 'terminada' as const } : {}) }
        await repo.updateLoan(userId, loanId, changes)
        patchOne(setLoans, loanId, changes)
      },
      deleteLoanPayment: async (loanId, paymentId) => {
        if (!userId) return
        const loan = loans.find((l) => l.id === loanId)
        if (!loan) return
        const payment = (loan.payments ?? []).find((p) => p.id === paymentId)
        if (payment?.movementId) {
          await repo.deleteMovement(userId, payment.movementId)
          removeOne(setMovements, payment.movementId)
        }
        const payments = (loan.payments ?? []).filter((p) => p.id !== paymentId)
        // Al quitar un pago el préstamo vuelve a estar vivo si queda saldo.
        const saldo = loanTotals({ ...loan, payments }).saldo
        const changes: Partial<Loan> = {
          payments,
          ...(saldo > 0 && loan.estado === 'terminada' ? { estado: 'activa' as const } : {}),
        }
        await repo.updateLoan(userId, loanId, changes)
        patchOne(setLoans, loanId, changes)
      },
    }),
    [loading, movements, categories, budgets, recurring, accounts, incomeSources, transfers, loans, projects, projectEntries, savingsBoxes, loadAll, userId]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

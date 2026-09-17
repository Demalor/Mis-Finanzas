import { createContext, useContext } from 'react'
import type { Movement, Category, Budget, RecurringMovement, Account, IncomeSource, Transfer, Loan, LoanPayment, Project, ProjectEntry } from '../types/models'

// categoryId no se guarda en el pago: solo clasifica el movimiento que se crea
// cuando el pago sale de una cuenta real.
export type LoanPaymentInput = Omit<LoanPayment, 'id' | 'movementId'> & { categoryId?: string }

export interface DataContextValue {
  loading: boolean
  movements: Movement[]
  categories: Category[]
  budgets: Budget[]
  recurring: RecurringMovement[]
  accounts: Account[]
  incomeSources: IncomeSource[]
  transfers: Transfer[]
  loans: Loan[]
  projects: Project[]
  projectEntries: ProjectEntry[]
  refresh: () => Promise<void>

  addMovement: (input: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Movement>
  updateMovement: (id: string, changes: Partial<Movement>) => Promise<void>
  deleteMovement: (id: string) => Promise<void>
  deleteMovements: (ids: string[]) => Promise<void>

  addCategory: (input: Omit<Category, 'id' | 'isDefault'>) => Promise<void>
  updateCategory: (id: string, changes: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  upsertBudget: (input: Omit<Budget, 'id'> & { id?: string }) => Promise<void>
  deleteBudget: (id: string) => Promise<void>

  addRecurring: (input: Omit<RecurringMovement, 'id'>) => Promise<void>
  updateRecurring: (id: string, changes: Partial<RecurringMovement>) => Promise<void>
  deleteRecurring: (id: string) => Promise<void>
  confirmRecurringPayment: (recurringId: string) => Promise<void>

  addAccount: (input: Omit<Account, 'id'>) => Promise<void>
  updateAccount: (id: string, changes: Partial<Account>) => Promise<void>
  deleteAccount: (id: string) => Promise<void>

  addIncomeSource: (input: Omit<IncomeSource, 'id'>) => Promise<void>
  updateIncomeSource: (id: string, changes: Partial<IncomeSource>) => Promise<void>
  deleteIncomeSource: (id: string) => Promise<void>

  addTransfer: (input: Omit<Transfer, 'id' | 'createdAt'>) => Promise<void>
  deleteTransfer: (id: string) => Promise<void>

  addLoan: (input: Omit<Loan, 'id'>) => Promise<void>
  updateLoan: (id: string, changes: Partial<Loan>) => Promise<void>
  deleteLoan: (id: string) => Promise<void>
  registerLoanPayment: (loanId: string, input: LoanPaymentInput) => Promise<void>
  deleteLoanPayment: (loanId: string, paymentId: string) => Promise<void>

  addProject: (input: Omit<Project, 'id'>) => Promise<void>
  updateProject: (id: string, changes: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  addProjectEntry: (input: Omit<ProjectEntry, 'id'>) => Promise<void>
  deleteProjectEntry: (id: string) => Promise<void>
}

export const DataContext = createContext<DataContextValue | null>(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData debe usarse dentro de DataProvider')
  return ctx
}

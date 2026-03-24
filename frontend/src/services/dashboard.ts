import { apiClient } from './api';
import type {
  DashboardSummary,
  CategorySpending,
  TrendPoint,
  RecurringItem,
  BudgetProgress,
  GoalProgress,
  FinancialHealthScore,
  HealthMetric,
} from '../types/dashboard';
import type { TransactionDto } from '../types/transaction';

const endpoint = '/dashboard';

type DashboardSummaryApi = {
  current_month_income: number;
  current_month_expense: number;
  net_balance: number;
  total_balance: number;
  total_budget: number;
  total_savings: number;
  active_budgets: number;
  upcoming_recurring: number;
};

type CategorySpendingApi = {
  category_id: number;
  category_name: string;
  color?: string | null;
  amount: number;
};

type TrendPointApi = {
  label: string;
  income: number;
  expense: number;
};

type RecurringItemApi = {
  id: number;
  description: string;
  amount: number;
  frequency: string;
  next_run: string;
  account_name: string;
};

type BudgetProgressApi = {
  id: number;
  category_name: string;
  limit_amount: number;
  spent: number;
  progress: number;
};

type GoalProgressApi = {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  progress: number;
  status: string;
  due_date: string;
};

type DashboardRecentTransactionApi = {
  id: number;
  account_id: number;
  transfer_account_id?: number | null;
  category_id?: number | null;
  type: TransactionDto['type'];
  amount: number;
  description: string;
  merchant?: string | null;
  payment_method?: string | null;
  tags: string[];
  transaction_date: string;
  created_at: string;
  updated_at: string;
  recurring_transaction_id?: number | null;
};

type HealthMetricApi = {
  label: string;
  detail: string;
  value: string | number;
  score: number;
};

type FinancialHealthApi = {
  score: number;
  breakdown: HealthMetricApi[];
  suggestions: string[] | null;
};

const normalizeSummary = (summary: DashboardSummaryApi): DashboardSummary => ({
  currentMonthIncome: summary.current_month_income,
  currentMonthExpense: summary.current_month_expense,
  netBalance: summary.net_balance,
  totalBalance: summary.total_balance,
  totalBudget: summary.total_budget,
  totalSavings: summary.total_savings,
  activeBudgets: summary.active_budgets,
  upcomingRecurring: summary.upcoming_recurring,
});

const normalizeSpending = (item: CategorySpendingApi): CategorySpending => ({
  categoryId: item.category_id,
  categoryName: item.category_name,
  color: item.color ?? undefined,
  amount: item.amount,
});

const normalizeRecurring = (item: RecurringItemApi): RecurringItem => ({
  id: item.id,
  description: item.description,
  amount: item.amount,
  frequency: item.frequency,
  nextRun: item.next_run,
  accountName: item.account_name,
});

const normalizeBudget = (item: BudgetProgressApi): BudgetProgress => ({
  id: item.id,
  categoryName: item.category_name,
  limitAmount: item.limit_amount,
  spent: item.spent,
  progress: item.progress,
});

const normalizeGoal = (item: GoalProgressApi): GoalProgress => ({
  id: item.id,
  name: item.name,
  targetAmount: item.target_amount,
  currentAmount: item.current_amount,
  progress: item.progress,
  status: item.status,
  dueDate: item.due_date,
});

const normalizeRecentTransaction = (item: DashboardRecentTransactionApi): TransactionDto => ({
  id: item.id,
  accountId: item.account_id,
  transferAccountId: item.transfer_account_id ?? undefined,
  categoryId: item.category_id ?? undefined,
  type: item.type,
  amount: item.amount,
  description: item.description,
  merchant: item.merchant ?? undefined,
  paymentMethod: item.payment_method ?? undefined,
  tags: item.tags ?? [],
  transactionDate: item.transaction_date,
  createdAt: item.created_at,
  updatedAt: item.updated_at,
  recurringTransactionId: item.recurring_transaction_id ?? undefined,
});

const normalizeHealthMetric = (metric: HealthMetricApi): HealthMetric => ({
  label: metric.label,
  detail: metric.detail,
  value: Number(metric.value ?? 0),
  score: metric.score,
});

const normalizeHealthScore = (payload: FinancialHealthApi): FinancialHealthScore => ({
  score: payload.score,
  breakdown: (payload.breakdown ?? []).map(normalizeHealthMetric),
  suggestions: payload.suggestions ?? [],
});

export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummaryApi>(`${endpoint}/summary`).then((res) => normalizeSummary(res.data)),
  spendingByCategory: () =>
    apiClient.get<CategorySpendingApi[]>(`${endpoint}/spending-by-category`).then((res) => res.data.map(normalizeSpending)),
  incomeVsExpense: () =>
    apiClient.get<TrendPointApi[]>(`${endpoint}/income-vs-expense`).then((res) => res.data),
  recentTransactions: () =>
    apiClient.get<DashboardRecentTransactionApi[]>(`${endpoint}/recent-transactions`).then((res) => res.data.map(normalizeRecentTransaction)),
  upcomingRecurring: () =>
    apiClient.get<RecurringItemApi[]>(`${endpoint}/upcoming-recurring`).then((res) => res.data.map(normalizeRecurring)),
  budgetProgress: () =>
    apiClient.get<BudgetProgressApi[]>(`${endpoint}/budget-progress`).then((res) => res.data.map(normalizeBudget)),
  goalsSummary: () => apiClient.get<GoalProgressApi[]>(`${endpoint}/goals-summary`).then((res) => res.data.map(normalizeGoal)),
  healthScore: () => apiClient.get<FinancialHealthApi>(`${endpoint}/health`).then((res) => normalizeHealthScore(res.data)),
};

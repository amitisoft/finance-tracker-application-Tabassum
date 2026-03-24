import type { TransactionDto } from './transaction';

export type DashboardSummary = {
  currentMonthIncome: number;
  currentMonthExpense: number;
  netBalance: number;
  totalBalance: number;
  totalBudget: number;
  totalSavings: number;
  activeBudgets: number;
  upcomingRecurring: number;
};

export type CategorySpending = {
  categoryId: number;
  categoryName: string;
  color?: string;
  amount: number;
};

export type TrendPoint = {
  label: string;
  income: number;
  expense: number;
};

export type RecurringItem = {
  id: number;
  description: string;
  amount: number;
  frequency: string;
  nextRun: string;
  accountName: string;
};

export type BudgetProgress = {
  id: number;
  categoryName: string;
  limitAmount: number;
  spent: number;
  progress: number;
};

export type GoalProgress = {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progress: number;
  status: string;
  dueDate: string;
};

export type DashboardRecentTransaction = TransactionDto;

export type DailyProjection = {
  date: string;
  projectedIncome: number;
  projectedExpense: number;
  netChange: number;
};

export type SafeToSpendIndicator = {
  amount: number;
  level: 'healthy' | 'caution' | 'critical';
  message: string;
};

export type RiskWarning = {
  message: string;
  severity: 'info' | 'warning' | 'critical';
};

export type CashFlowForecast = {
  projectedEndOfMonthBalance: number;
  projectedMonthlyNet: number;
  dailyNetAverage: number;
  dailyProjections: DailyProjection[];
  safeToSpend: SafeToSpendIndicator;
  riskWarnings: RiskWarning[];
};

export type HealthMetric = {
  label: string;
  detail: string;
  value: number;
  score: number;
};

export type FinancialHealthScore = {
  score: number;
  breakdown: HealthMetric[];
  suggestions: string[];
};

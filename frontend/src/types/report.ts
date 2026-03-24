export type ReportsFilter = {
  startDate?: string;
  endDate?: string;
  accountId?: number;
  categoryId?: number;
  transactionType?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
};

export type CategorySpendReport = {
  categoryId: number;
  categoryName: string;
  color?: string;
  icon?: string | null;
  amount: number;
  percentage: number;
};

export type AccountBalancePoint = {
  accountId: number;
  accountName: string;
  date: string;
  balance: number;
};

export type ReportTrendPoint = {
  label: string;
  income: number;
  expense: number;
};

export type MonthlyTrend = {
  month: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
};

export type CategoryTrendPoint = {
  month: string;
  label: string;
  amount: number;
};

export type CategoryTrend = {
  categoryId: number;
  categoryName: string;
  color?: string;
  points: CategoryTrendPoint[];
};

export type NetWorthPoint = {
  month: string;
  label: string;
  balance: number;
};

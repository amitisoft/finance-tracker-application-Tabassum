import { apiClient } from './api';
import type {
  AccountBalancePoint,
  CategorySpendReport,
  CategoryTrend,
  CategoryTrendPoint,
  MonthlyTrend,
  NetWorthPoint,
  ReportTrendPoint,
  ReportsFilter,
} from '../types/report';

const sanitizeFilters = (filters: ReportsFilter) => {
  const params: Record<string, string | number> = {};
  if (filters.startDate) {
    params.startDate = filters.startDate;
  }
  if (filters.endDate) {
    params.endDate = filters.endDate;
  }
  if (filters.accountId) {
    params.accountId = filters.accountId;
  }
  if (filters.categoryId) {
    params.categoryId = filters.categoryId;
  }
  if (filters.transactionType) {
    params.transactionType = filters.transactionType;
  }
  return params;
};

type CategorySpendApi = {
  category_id: number;
  category_name: string;
  color?: string | null;
  icon?: string | null;
  amount: number;
  percentage: number;
};

type AccountBalancePointApi = {
  account_id: number;
  account_name: string;
  date: string;
  balance: number;
};

type MonthlyTrendApi = {
  month: string;
  label: string;
  income: string | number;
  expense: string | number;
  savings: string | number;
  savings_rate: string | number;
};

type CategoryTrendPointApi = {
  month: string;
  label: string;
  amount: string | number;
};

type CategoryTrendApi = {
  category_id: number;
  category_name: string;
  color?: string | null;
  points: CategoryTrendPointApi[] | null;
};

type ReportsTrendApi = {
  monthly_aggregates: MonthlyTrendApi[] | null;
  category_trends: CategoryTrendApi[] | null;
};

type NetWorthPointApi = {
  month: string;
  label: string;
  balance: string | number;
};

const normalizeCategorySpend = (item: CategorySpendApi): CategorySpendReport => ({
  categoryId: item.category_id,
  categoryName: item.category_name,
  color: item.color ?? undefined,
  icon: item.icon ?? undefined,
  amount: Number(item.amount),
  percentage: Number(item.percentage),
});

const normalizeBalancePoint = (item: AccountBalancePointApi): AccountBalancePoint => ({
  accountId: item.account_id,
  accountName: item.account_name,
  date: item.date,
  balance: Number(item.balance),
});

const toNumber = (value: string | number | null | undefined) =>
  typeof value === 'number' ? value : Number(value ?? 0);

const normalizeMonthlyTrend = (item: MonthlyTrendApi): MonthlyTrend => ({
  month: item.month,
  label: item.label,
  income: toNumber(item.income),
  expense: toNumber(item.expense),
  savings: toNumber(item.savings),
  savingsRate: toNumber(item.savings_rate),
});

const normalizeCategoryTrendPoint = (item: CategoryTrendPointApi): CategoryTrendPoint => ({
  month: item.month,
  label: item.label,
  amount: toNumber(item.amount),
});

const normalizeCategoryTrend = (item: CategoryTrendApi): CategoryTrend => ({
  categoryId: item.category_id,
  categoryName: item.category_name,
  color: item.color ?? undefined,
  points: (item.points ?? []).map(normalizeCategoryTrendPoint),
});

const normalizeTrendResponse = (payload: ReportsTrendApi) => ({
  monthlyAggregates: (payload.monthly_aggregates ?? []).map(normalizeMonthlyTrend),
  categoryTrends: (payload.category_trends ?? []).map(normalizeCategoryTrend),
});

const normalizeNetWorthPoint = (item: NetWorthPointApi): NetWorthPoint => ({
  month: item.month,
  label: item.label,
  balance: toNumber(item.balance),
});

export const reportsApi = {
  categorySpend: (filters: ReportsFilter) =>
    apiClient
      .get<CategorySpendApi[]>('/reports/category-spend', { params: sanitizeFilters(filters) })
      .then((res) => res.data.map(normalizeCategorySpend)),
  incomeVsExpense: (filters: ReportsFilter) =>
    apiClient
      .get<ReportTrendPoint[]>('/reports/income-vs-expense', { params: sanitizeFilters(filters) })
      .then((res) => res.data),
  accountBalanceTrend: (filters: ReportsFilter) =>
    apiClient
      .get<AccountBalancePointApi[]>('/reports/account-balance-trend', { params: sanitizeFilters(filters) })
      .then((res) => res.data.map(normalizeBalancePoint)),
  trends: (filters: ReportsFilter) =>
    apiClient
      .get<ReportsTrendApi>('/reports/trends', { params: sanitizeFilters(filters) })
      .then((res) => normalizeTrendResponse(res.data)),
  netWorth: (filters: ReportsFilter) =>
    apiClient
      .get<NetWorthPointApi[]>('/reports/net-worth', { params: sanitizeFilters(filters) })
      .then((res) => res.data.map(normalizeNetWorthPoint)),
  exportCsv: (filters: ReportsFilter) =>
    apiClient
      .get('/reports/export/csv', {
        params: sanitizeFilters(filters),
        responseType: 'blob',
      })
      .then((res) => res.data),
};

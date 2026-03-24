import { apiClient } from './api';
import type {
  InsightsSummary,
  InsightCategoryChange,
  InsightWarning,
  HighestSpendingCategory,
  SavingsChange,
} from '../types/insights';

type InsightCategoryChangeApi = {
  category_id: number | null;
  category_name: string;
  previous_amount: string | number;
  current_amount: string | number;
  change: string | number;
};

type SavingsChangeApi = {
  previous_savings: string | number;
  current_savings: string | number;
  change: string | number;
};

type HighestSpendingCategoryApi = {
  category_id?: number | null;
  category_name: string;
  amount: string | number;
};

type InsightWarningApi = {
  level: InsightWarning['level'];
  message: string;
};

type InsightsApiResponse = {
  category_changes: InsightCategoryChangeApi[] | null;
  savings_change: SavingsChangeApi;
  highest_spending_category: HighestSpendingCategoryApi;
  expense_warning: InsightWarningApi | null;
};

const toNumber = (value: string | number | null | undefined) =>
  typeof value === 'number' ? value : Number(value ?? 0);

const normalizeCategoryChange = (item: InsightCategoryChangeApi): InsightCategoryChange => ({
  categoryId: item.category_id,
  categoryName: item.category_name,
  previousAmount: toNumber(item.previous_amount),
  currentAmount: toNumber(item.current_amount),
  change: toNumber(item.change),
});

const normalizeSavingsChange = (item: SavingsChangeApi): SavingsChange => ({
  previousSavings: toNumber(item.previous_savings),
  currentSavings: toNumber(item.current_savings),
  change: toNumber(item.change),
});

const normalizeHighestSpending = (item: HighestSpendingCategoryApi): HighestSpendingCategory => ({
  categoryId: item.category_id ?? undefined,
  categoryName: item.category_name,
  amount: toNumber(item.amount),
});

const normalizeWarning = (warning: InsightWarningApi | null): InsightWarning | undefined =>
  warning ? { level: warning.level, message: warning.message } : undefined;

const normalizeInsights = (payload: InsightsApiResponse): InsightsSummary => ({
  categoryChanges: (payload.category_changes ?? []).map(normalizeCategoryChange),
  savingsChange: normalizeSavingsChange(payload.savings_change),
  highestSpendingCategory: normalizeHighestSpending(payload.highest_spending_category),
  expenseWarning: normalizeWarning(payload.expense_warning),
});

export const insightsApi = {
  getInsights: () => apiClient.get<InsightsApiResponse>('/insights').then((res) => normalizeInsights(res.data)),
};

export type InsightCategoryChange = {
  categoryId: number | null;
  categoryName: string;
  previousAmount: number;
  currentAmount: number;
  change: number;
};

export type SavingsChange = {
  previousSavings: number;
  currentSavings: number;
  change: number;
};

export type HighestSpendingCategory = {
  categoryId?: number | null;
  categoryName: string;
  amount: number;
};

export type InsightWarning = {
  level: 'info' | 'warning' | 'critical';
  message: string;
};

export type InsightsSummary = {
  categoryChanges: InsightCategoryChange[];
  savingsChange: SavingsChange;
  highestSpendingCategory: HighestSpendingCategory;
  expenseWarning?: InsightWarning;
};

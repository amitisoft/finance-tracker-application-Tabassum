import type { CashFlowForecast, DailyProjection, RiskWarning, SafeToSpendIndicator } from '../types/dashboard';
import { apiClient } from './api';

type ForecastDailyProjectionApi = {
  date: string;
  projected_income: string | number;
  projected_expense: string | number;
  net_change: string | number;
};

type ForecastSafeToSpendApi = {
  amount: string | number;
  level: SafeToSpendIndicator['level'];
  message: string;
};

type ForecastRiskWarningApi = {
  message: string;
  severity: RiskWarning['severity'];
};

type ForecastApiResponse = {
  projected_end_of_month_balance: string | number;
  projected_monthly_net: string | number;
  daily_net_average: string | number;
  daily_projections: ForecastDailyProjectionApi[] | null;
  safe_to_spend: ForecastSafeToSpendApi | null;
  risk_warnings: ForecastRiskWarningApi[] | null;
};

const toNumber = (value: string | number | null | undefined) =>
  typeof value === 'number' ? value : Number(value ?? 0);

const normalizeDailyProjection = (projection: ForecastDailyProjectionApi): DailyProjection => ({
  date: projection.date,
  projectedIncome: toNumber(projection.projected_income),
  projectedExpense: toNumber(projection.projected_expense),
  netChange: toNumber(projection.net_change),
});

const normalizeRiskWarning = (warning: ForecastRiskWarningApi): RiskWarning => ({
  message: warning.message,
  severity: warning.severity,
});

const normalizeSafeToSpend = (safe?: ForecastSafeToSpendApi): SafeToSpendIndicator => {
  const fallback: SafeToSpendIndicator = {
    amount: 0,
    level: 'critical',
    message: 'Forecast not available',
  };
  const source = safe ?? fallback;
  return {
    amount: toNumber(source.amount),
    level: source.level,
    message: source.message,
  };
};

const normalizeForecastResponse = (payload: ForecastApiResponse): CashFlowForecast => ({
  projectedEndOfMonthBalance: toNumber(payload.projected_end_of_month_balance),
  projectedMonthlyNet: toNumber(payload.projected_monthly_net),
  dailyNetAverage: toNumber(payload.daily_net_average),
  dailyProjections: (payload.daily_projections ?? []).map(normalizeDailyProjection),
  safeToSpend: normalizeSafeToSpend(payload.safe_to_spend ?? { amount: 0, level: 'critical', message: 'Forecast unavailable' }),
  riskWarnings: (payload.risk_warnings ?? []).map(normalizeRiskWarning),
});

export const forecastApi = {
  getForecast: () => apiClient.get<ForecastApiResponse>('/dashboard/forecast').then((res) => normalizeForecastResponse(res.data)),
};

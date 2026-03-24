import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useInsights } from '../hooks/useInsights';
import { useNetWorthTrend, useReportsTrends } from '../hooks/useReports';
import { formatCurrency } from '../utils/format';
import type { CategoryTrend, CategoryTrendPoint, ReportsFilter } from '../types/report';
import './InsightsPage.css';


const DEFAULT_REPORT_FILTERS: ReportsFilter = {};

const currencyFormatter = (value?: number | string | (number | string)[]) =>
  formatCurrency(Number(Array.isArray(value) ? value[0] ?? 0 : value ?? 0));


export default function InsightsPage() {
  const insightsQuery = useInsights();
  const filters = useMemo<ReportsFilter>(() => DEFAULT_REPORT_FILTERS, []);
  const trendsQuery = useReportsTrends(filters);
  const netWorthQuery = useNetWorthTrend(filters);

  const insights = insightsQuery.data;
  const trends = trendsQuery.data;
  const netWorth = netWorthQuery.data ?? [];
  const monthlyAggregates = trends?.monthlyAggregates ?? [];
  const categoryTrends = trends?.categoryTrends ?? [];

  const highlightChange = insights?.categoryChanges[0];
  const savingsChange = insights?.savingsChange;
  const warning = insights?.expenseWarning;

  const savingsPercent = useMemo(() => {
    if (!savingsChange || savingsChange.previousSavings === 0) {
      return '';
    }
    const ratio = savingsChange.change / Math.abs(savingsChange.previousSavings);
    const percent = Math.round(ratio * 100);
    return `${percent > 0 ? '+' : ''}${percent}%`;
  }, [savingsChange]);

  const categoryTrendState = useMemo(() => {
    if (monthlyAggregates.length === 0 || categoryTrends.length === 0) {
      return { rows: [], categories: [] as CategoryTrend[] };
    }
    const totalFor = (points: CategoryTrendPoint[]) =>
      points.reduce((acc, point) => acc + point.amount, 0);
    const sorted = [...categoryTrends].sort(
      (a, b) => totalFor(b.points) - totalFor(a.points)
    );
    const rows = monthlyAggregates.map((month) => {
      const entry: Record<string, number | string> = { label: month.label };
      sorted.forEach((category) => {
        const point = category.points.find((item) => item.month === month.month);
        entry[category.categoryName] = point?.amount ?? 0;
      });
      return entry;
    });
    return { rows, categories: sorted };
  }, [categoryTrends, monthlyAggregates]);

  const categoryChartData = categoryTrendState.rows;
  const activeCategories = categoryTrendState.categories;
  const incomeExpenseData = monthlyAggregates;
  const hasCategoryChartData = categoryChartData.length > 0 && activeCategories.length > 0;
  const hasIncomeExpenseData = incomeExpenseData.length > 0;
  const hasNetWorthData = netWorth.length > 0;
  console.log('Insights trends', trends);
  console.log('Category chart data', categoryChartData);
  console.log('Active categories', activeCategories);
  console.log('Net worth', netWorth);
  const isLoading = insightsQuery.isLoading || trendsQuery.isLoading || netWorthQuery.isLoading;
  const hasError = insightsQuery.isError || trendsQuery.isError || netWorthQuery.isError;

  return (
    <div className="insights-page">
      <header className="insights-hero">
        <div>
          <p className="insights-eyebrow">Insights</p>
          <h1>Advanced reporting & insights</h1>
          <p>
            Track how your spending and savings trends evolve over time, monitor net worth, and get
            cues when expenses drift away from your plan.
          </p>
        </div>
        <div className="insights-hero-meta">
          <span>Last updated</span>
          <strong>{new Date().toLocaleDateString()}</strong>
        </div>
      </header>

      {hasError && (
        <div className="insights-error">Some reports failed to load. Try refreshing the page.</div>
      )}
      {isLoading && (
        <div className="insights-loading">Loading insights, trends, and forecasts...</div>
      )}

      <section className="insights-highlight-grid">
        <article className="insights-highlight-card">
          <p className="insights-label">Highest spending this month</p>
          <h3>{insights?.highestSpendingCategory.categoryName ?? 'No spending yet'}</h3>
          <p className="insights-value">
            {currencyFormatter(insights?.highestSpendingCategory.amount ?? 0)}
          </p>
          <p className="insights-subtext">
            {highlightChange
              ? `${highlightChange.change >= 0 ? '+' : ''}${currencyFormatter(highlightChange.change)} vs last month`
              : 'No category change data yet.'}
          </p>
        </article>
        

        <article className="insights-highlight-card">
          <p className="insights-label">Savings delta</p>
          <h3>{currencyFormatter(savingsChange?.change ?? 0)}</h3>
          <p className="insights-value-small">{savingsPercent ? `${savingsPercent} vs last month` : 'Savings stable'}</p>
          <p className="insights-subtext">
            {savingsChange?.currentSavings !== undefined
              ? `Current savings ${currencyFormatter(savingsChange.currentSavings)}`
              : 'Savings data not available.'}
          </p>
        </article>

        <article
          className={`insights-highlight-card ${
            warning ? `insights-highlight-card--${warning.level}` : 'insights-highlight-card--info'
          }`}
        >
          <p className="insights-label">Expense warning</p>
          <h3>{warning ? warning.level.toUpperCase() : 'Steady'}</h3>
          <p className="insights-subtext">
            {warning?.message ?? 'Expenses are tracking in line with last month.'}
          </p>
        </article>
      </section>

      <section className="insights-chart-grid">
        <article className="insights-chart-card">
          <header>
            <h4>Category spend trends</h4>
            <p>Top categories over the selected months</p>
          </header>
          {hasCategoryChartData ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={currencyFormatter} />
                  <Legend />
                  {activeCategories.map((category) => (
                    <Line
                      key={category.categoryId}
                      type="monotone"
                      dataKey={category.categoryName}
                      stroke={category.color ?? '#6366f1'}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="insights-empty">Awaiting category trend data.</div>
          )}
        </article>

        <article className="insights-chart-card">
          <header>
            <h4>Income vs expense</h4>
            <p>Monthly aggregation</p>
          </header>
          {hasIncomeExpenseData ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={currencyFormatter} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10b981" dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="insights-empty">Income/expense data will appear after recording transactions.</div>
          )}
        </article>

        <article className="insights-chart-card">
          <header>
            <h4>Net worth</h4>
            <p>Time-series of available balances</p>
          </header>
          {hasNetWorthData ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={netWorth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={currencyFormatter} />
                  <Line type="monotone" dataKey="balance" stroke="#2563eb" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="insights-empty">Net worth snapshot will update once accounts are synced.</div>
          )}
        </article>
      </section>
    </div>
  );
}

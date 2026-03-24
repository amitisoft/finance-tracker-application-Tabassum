import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  useDashboardBudgetProgress,
  useDashboardGoalsSummary,
  useDashboardRecentTransactions,
  useDashboardSpending,
  useDashboardSummary,
  useDashboardTrend,
  useDashboardUpcomingRecurring,
  useCashFlowForecast,
  useHealthScore,
} from '../hooks/useDashboard';
import { formatCurrency } from '../utils/format';
import DashboardTopBar from '../components/DashboardTopBar';
import './DashboardPage.css';

const formatDate = (value: string) => new Date(value).toLocaleDateString();

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const ringPalette = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444'];
const safeLevelCopy: Record<'healthy' | 'caution' | 'critical', string> = {
  healthy: 'Healthy buffer',
  caution: 'Caution',
  critical: 'Critical',
};

const healthStatusCopy: Record<'healthy' | 'caution' | 'critical', string> = {
  healthy: 'Stable',
  caution: 'Needs attention',
  critical: 'At risk',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const summaryQuery = useDashboardSummary();
  const spendingQuery = useDashboardSpending();
  const trendQuery = useDashboardTrend();
  const recentQuery = useDashboardRecentTransactions();
  const recurringQuery = useDashboardUpcomingRecurring();
  const budgetQuery = useDashboardBudgetProgress();
  const goalsQuery = useDashboardGoalsSummary();

  const summary = summaryQuery.data;
  const spendingData = spendingQuery.data ?? [];
  const trendData = trendQuery.data ?? [];
  const recentTransactions = recentQuery.data ?? [];
  const recurringList = recurringQuery.data ?? [];
  const budgetList = budgetQuery.data ?? [];
  const goalList = goalsQuery.data ?? [];
  const forecastQuery = useCashFlowForecast();
  const forecast = forecastQuery.data;
  const forecastProjections = forecast?.dailyProjections ?? [];
  const forecastWarnings = forecast?.riskWarnings ?? [];
  const safeLevelLabel = forecast?.safeToSpend?.level
    ? safeLevelCopy[forecast.safeToSpend.level]
    : 'Caution';
  const healthQuery = useHealthScore();
  const healthScore = healthQuery.data;
  const healthBreakdown = healthScore?.breakdown ?? [];
  const healthSuggestions = healthScore?.suggestions ?? [];
  const healthTone: 'healthy' | 'caution' | 'critical' = healthScore
    ? healthScore.score >= 70
      ? 'healthy'
      : healthScore.score >= 45
      ? 'caution'
      : 'critical'
    : 'healthy';
  const healthStatusLabel = healthStatusCopy[healthTone];

  const totalSpent = useMemo(
    () => spendingData.reduce((sum, item) => sum + Number(item.amount ?? 0), 0),
    [spendingData]
  );

  const topCategory = useMemo(() => {
    if (spendingData.length === 0) {
      return null;
    }
    return [...spendingData].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
  }, [spendingData]);

  const donutData = useMemo(
    () =>
      spendingData.map((item, index) => ({
        ...item,
        share: totalSpent > 0 ? (Number(item.amount) / totalSpent) * 100 : 0,
        fill: item.color || ringPalette[index % ringPalette.length],
      })),
    [spendingData, totalSpent]
  );

  const summaryCards = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      {
        label: 'Monthly Income',
        value: formatCurrency(summary.currentMonthIncome),
        tone: 'income',
        note: 'Money added this month',
      },
      {
        label: 'Monthly Expense',
        value: formatCurrency(summary.currentMonthExpense),
        tone: 'expense',
        note: 'Money spent this month',
      },
      {
        label: 'Net Balance',
        value: formatCurrency(summary.netBalance),
        tone: 'neutral',
        note: 'Income minus expense',
      },
      {
        label: 'Total Balance',
        value: formatCurrency(summary.totalBalance),
        tone: 'balance',
        note: 'Across all accounts',
      },
    ];
  }, [summary]);

  const snapshotCards = useMemo(() => {
    if (!summary) {
      return [];
    }

    return [
      { label: 'Budgets Active', value: summary.activeBudgets },
      { label: 'Recurring Soon', value: summary.upcomingRecurring },
      { label: 'Budget Pool', value: formatCurrency(summary.totalBudget) },
      { label: 'Goal Savings', value: formatCurrency(summary.totalSavings) },
    ];
  }, [summary]);

  return (
    <section className="page-panel dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <p className="dashboard-eyebrow">Finance overview</p>
          <h1>Your dashboard</h1>
          <p>
            See where your money is going, how much you have left, and which budgets,
            goals, and recurring items need attention.
          </p>
        </div>
        <div className="dashboard-hero-actions">
          <DashboardTopBar />
        </div>
      </div>

      {summaryQuery.isError && (
        <div className="feedback error">
          {errorMessage(summaryQuery.error, 'Unable to load dashboard summary')}
        </div>
      )}

      <div className="dashboard-kpis">
        {summaryCards.length === 0
          ? Array.from({ length: 4 }).map((_, idx) => (
              <article key={idx} className="dashboard-card skeleton-card">
                <strong className="loading-pill">Loading...</strong>
                <span className="card-label">Preparing dashboard</span>
              </article>
            ))
          : summaryCards.map((card) => (
              <article key={card.label} className={`dashboard-card tone-${card.tone}`}>
                <span className="card-label">{card.label}</span>
                <strong>{card.value}</strong>
                <p className="card-meta">{card.note}</p>
                {card.label === 'Monthly Income' && summary && Number(summary.currentMonthIncome) === 0 && (
                  <button
                    type="button"
                    className="inline-action-btn"
                    onClick={() => navigate('/transactions/new?type=INCOME')}
                  >
                    Add income entry
                  </button>
                )}
              </article>
            ))}
      </div>

      <div className="dashboard-snapshot">
        {snapshotCards.map((item) => (
          <div key={item.label} className="snapshot-chip">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="dashboard-health">
        <section className="dashboard-widget health-widget">
          <header className="widget-header">
            <div>
              <h3>Financial health</h3>
              <p className="widget-copy">
                A 0–100 score that blends buffer days, savings rate, and recurring coverage into one insight.
              </p>
            </div>
            <span className="widget-subtitle">Health</span>
          </header>

          {healthQuery.isLoading && <div className="loading-pill">Assessing financial health...</div>}
          {healthQuery.isError && (
            <div className="feedback error">
              {errorMessage(healthQuery.error, 'Unable to evaluate financial health')}
            </div>
          )}

          {healthScore && (
            <div className="health-body">
              <div className="health-summary">
                <div className={`health-score-ring level-${healthTone}`}>
                  <strong>{healthScore.score}</strong>
                  <span>out of 100</span>
                </div>
                <div className="health-copy">
                  <p className="health-status">{healthStatusLabel}</p>
                  <p className="muted-text">
                    Buffer, savings, and recurring coverage are weighted equally to inform the overall score.
                  </p>
                </div>
              </div>

              <div className="health-breakdown">
                {healthBreakdown.map((metric) => (
                  <div key={metric.label} className="health-breakdown-row">
                    <div>
                      <strong>{metric.label}</strong>
                      <p className="muted-text">{metric.detail}</p>
                    </div>
                    <div className="health-progress">
                      <div className="health-progress-track">
                        <div className="health-progress-fill" style={{ width: `${metric.score}%` }} />
                      </div>
                      <span className="health-progress-value">{metric.score}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="health-suggestions">
                <h4>Suggestions</h4>
                <ul>
                  {healthSuggestions.length === 0 ? (
                    <li>Keep building the habits that brought this score to life.</li>
                  ) : (
                    healthSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)
                  )}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-forecast">
        <section className="dashboard-widget forecast-widget">
          <header className="widget-header">
            <div>
              <h3>Cash flow forecast</h3>
              <p className="widget-copy">
                Projected end-of-month balance, daily outlook, and risk cues to keep spending in check.
              </p>
            </div>
            <span className="widget-subtitle">Forecast</span>
          </header>

          {forecastQuery.isLoading && <div className="loading-pill">Forecasting cash flow...</div>}
          {forecastQuery.isError && (
            <div className="feedback error">
              {errorMessage(forecastQuery.error, 'Unable to build cash flow forecast')}
            </div>
          )}

          {forecast && (
            <div className="forecast-content">
              <div className="forecast-summary-grid">
                <article className="forecast-card">
                  <span className="card-label">Projected end-of-month balance</span>
                  <strong>{formatCurrency(forecast.projectedEndOfMonthBalance)}</strong>
                  <p className="forecast-note">
                    Monthly net {formatCurrency(forecast.projectedMonthlyNet)}
                  </p>
                </article>
                <article className={`forecast-card safe-card safe-${forecast.safeToSpend.level}`}>
                  <span className="card-label">Safe to spend</span>
                  <strong>{formatCurrency(forecast.safeToSpend.amount)}</strong>
                  <p className="forecast-note">{forecast.safeToSpend.message}</p>
                  <span className={`safe-badge level-${forecast.safeToSpend.level}`}>
                    {safeLevelLabel}
                  </span>
                </article>
                <article className="forecast-card">
                  <span className="card-label">Daily net pace</span>
                  <strong>{formatCurrency(forecast.dailyNetAverage)}</strong>
                  <p className="forecast-note">Average of recent days</p>
                </article>
              </div>

              <div className="forecast-projections">
                <h4>Daily projection</h4>
                {forecastProjections.length === 0 ? (
                  <div className="empty-mini muted-text">Not enough data for daily projections yet.</div>
                ) : (
                  <div className="daily-projection-grid">
                    {forecastProjections.map((projection) => (
                      <article key={projection.date} className="daily-projection-card">
                        <span className="forecast-date">{formatDate(projection.date)}</span>
                        <strong className={projection.netChange >= 0 ? 'positive' : 'negative'}>
                          {formatCurrency(projection.netChange)}
                        </strong>
                        <div className="projection-row">
                          <small>Income</small>
                          <span>{formatCurrency(projection.projectedIncome)}</span>
                        </div>
                        <div className="projection-row">
                          <small>Expense</small>
                          <span>{formatCurrency(projection.projectedExpense)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="forecast-risk">
                <h4>Risk warnings</h4>
                {forecastWarnings.length === 0 ? (
                  <p className="muted-text">No active warnings. Keep tracking to stay ahead.</p>
                ) : (
                  <div className="risk-badges">
                    {forecastWarnings.map((warning) => (
                      <span
                        key={`${warning.message}-${warning.severity}`}
                        className={`risk-badge severity-${warning.severity}`}
                      >
                        {warning.message}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-main-grid">
        <section className="dashboard-widget analysis-widget">
          <header className="widget-header">
            <div>
              <h3>Spending analysis</h3>
              <p className="widget-copy">Category-wise expense split for the current month.</p>
            </div>
            <span className="widget-subtitle">Expense ring</span>
          </header>

          {spendingQuery.isError && (
            <div className="feedback error">
              {errorMessage(spendingQuery.error, 'Unable to load spending data')}
            </div>
          )}

          {spendingQuery.isLoading && <div className="loading-pill">Loading analysis...</div>}

          {!spendingQuery.isLoading && donutData.length === 0 && (
            <div className="empty-state">No spending recorded yet for this month.</div>
          )}

          {donutData.length > 0 && (
            <div className="analysis-layout">
              <div className="donut-shell">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="amount"
                      nameKey="categoryName"
                      innerRadius={78}
                      outerRadius={112}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {donutData.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ borderRadius: 14, border: '1px solid #dbe4ee' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <span>Total spent</span>
                  <strong>{formatCurrency(totalSpent)}</strong>
                  <small>{topCategory ? `Top: ${topCategory.categoryName}` : 'No category yet'}</small>
                </div>
              </div>

              <div className="analysis-breakdown">
                {donutData.map((item) => (
                  <div key={item.categoryId} className="analysis-row">
                    <div className="analysis-label">
                      <span className="color-dot" style={{ backgroundColor: item.fill }} />
                      <div>
                        <strong>{item.categoryName}</strong>
                        <small>{item.share.toFixed(0)}% of monthly spending</small>
                      </div>
                    </div>
                    <span className="analysis-value">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="dashboard-widget trend-widget">
          <header className="widget-header">
            <div>
              <h3>Cashflow trend</h3>
              <p className="widget-copy">Income and expense movement over the last two weeks.</p>
            </div>
            <span className="widget-subtitle">14 days</span>
          </header>

          {trendQuery.isError && (
            <div className="feedback error">
              {errorMessage(trendQuery.error, 'Unable to load trend')}
            </div>
          )}
          {trendQuery.isLoading && <div className="loading-pill">Loading trend...</div>}
          {!trendQuery.isLoading && trendData.length === 0 && (
            <div className="empty-state">No activity logged yet.</div>
          )}
          {trendData.length > 0 && (
            <div className="chart-wrapper chart-tall">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="dashboardIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="dashboardExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ee" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b' }} />
                  <YAxis tick={{ fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: 14, border: '1px solid #dbe4ee' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#16a34a" fill="url(#dashboardIncome)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#dashboardExpense)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="dashboard-widget transactions-widget">
          <header className="widget-header">
            <div>
              <h3>Recent transactions</h3>
              <p className="widget-copy">Your latest five transaction records.</p>
            </div>
          </header>
          {recentQuery.isError && (
            <div className="feedback error">
              {errorMessage(recentQuery.error, 'Unable to load transactions')}
            </div>
          )}
          {recentQuery.isLoading && <div className="loading-pill">Loading list...</div>}
          {!recentQuery.isLoading && recentTransactions.length === 0 && (
            <div className="empty-state">No transactions yet. Start by adding your first transaction.</div>
          )}
          {recentTransactions.length > 0 && (
            <ul className="transactions-list">
              {recentTransactions.map((transaction) => (
                <li key={transaction.id}>
                  <div>
                    <p>{transaction.description || 'Untitled transaction'}</p>
                    <span className="muted-text">
                      {formatDate(transaction.transactionDate)} · {transaction.type}
                    </span>
                  </div>
                  <div className={`amount-badge ${transaction.type.toLowerCase()}`}>
                    {formatCurrency(transaction.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dashboard-widget budgets-widget">
          <header className="widget-header">
            <div>
              <h3>Budget watch</h3>
              <p className="widget-copy">See which categories are closest to their limits.</p>
            </div>
          </header>
          {budgetQuery.isError && (
            <div className="feedback error">
              {errorMessage(budgetQuery.error, 'Unable to load budgets')}
            </div>
          )}
          {budgetQuery.isLoading && <div className="loading-pill">Loading budgets...</div>}
          {!budgetQuery.isLoading && budgetList.length === 0 && (
            <div className="empty-state">No budgets yet. Create one to track monthly limits.</div>
          )}
          {budgetList.length > 0 && (
            <div className="goal-stack">
              {budgetList.slice(0, 4).map((budget) => (
                <div key={budget.id} className="goal-card">
                  <div className="goal-card-header">
                    <strong>{budget.categoryName}</strong>
                    <span className="muted-text">{Math.round(budget.progress * 100)}%</span>
                  </div>
                  <div className="goal-finance">
                    <span>{formatCurrency(budget.spent)}</span>
                    <small>of {formatCurrency(budget.limitAmount)}</small>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${Math.round(Math.min(budget.progress, 1) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-widget planning-widget">
          <header className="widget-header">
            <div>
              <h3>Goals and recurring</h3>
              <p className="widget-copy">Upcoming money commitments and savings targets.</p>
            </div>
          </header>

          <div className="planning-block">
            <h4>Upcoming recurring</h4>
            {recurringQuery.isError && (
              <div className="feedback error">
                {errorMessage(recurringQuery.error, 'Unable to load recurring items')}
              </div>
            )}
            {!recurringQuery.isError && recurringQuery.isLoading && <div className="loading-pill">Checking recurring...</div>}
            {!recurringQuery.isLoading && recurringList.length === 0 && (
              <div className="empty-mini">No recurring items scheduled.</div>
            )}
            {recurringList.length > 0 && (
              <ul className="recurring-list">
                {recurringList.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    <div>
                      <p>{item.description}</p>
                      <span className="muted-text">{formatDate(item.nextRun)} · {item.frequency}</span>
                    </div>
                    <div className="recurring-amount">{formatCurrency(item.amount)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="planning-block">
            <h4>Goal progress</h4>
            {goalsQuery.isError && (
              <div className="feedback error">
                {errorMessage(goalsQuery.error, 'Unable to load goal progress')}
              </div>
            )}
            {!goalsQuery.isError && goalsQuery.isLoading && <div className="loading-pill">Loading goals...</div>}
            {!goalsQuery.isLoading && goalList.length === 0 && (
              <div className="empty-mini">No active goals yet.</div>
            )}
            {goalList.length > 0 && (
              <div className="goal-stack">
                {goalList.slice(0, 3).map((goal) => (
                  <div key={goal.id} className="goal-card">
                    <div className="goal-card-header">
                      <strong>{goal.name}</strong>
                      <span className="muted-text">{goal.status}</span>
                    </div>
                    <div className="goal-finance">
                      <span>{formatCurrency(goal.currentAmount)}</span>
                      <small>of {formatCurrency(goal.targetAmount)}</small>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                    </div>
                    <small className="muted-text">Due {formatDate(goal.dueDate)}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

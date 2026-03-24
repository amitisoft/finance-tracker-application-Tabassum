package com.finance.tracker.service;

import com.finance.tracker.dto.dashboard.BudgetProgressDto;
import com.finance.tracker.dto.dashboard.CashFlowForecastDto;
import com.finance.tracker.dto.dashboard.CategorySpendingDto;
import com.finance.tracker.dto.dashboard.DailyProjectionDto;
import com.finance.tracker.dto.dashboard.DashboardSummaryDto;
import com.finance.tracker.dto.dashboard.FinancialHealthScoreDto;
import com.finance.tracker.dto.dashboard.GoalProgressDto;
import com.finance.tracker.dto.dashboard.HealthMetricDto;
import com.finance.tracker.dto.dashboard.RecurringItemDto;
import com.finance.tracker.dto.dashboard.RiskWarningDto;
import com.finance.tracker.dto.dashboard.SafeToSpendDto;
import com.finance.tracker.dto.dashboard.TrendPointDto;
import com.finance.tracker.dto.transaction.TransactionDto;
import com.finance.tracker.entity.Account;
import com.finance.tracker.entity.Budget;
import com.finance.tracker.entity.Goal;
import com.finance.tracker.entity.RecurringFrequency;
import com.finance.tracker.entity.RecurringTransaction;
import com.finance.tracker.entity.Transaction;
import com.finance.tracker.entity.Transaction.TransactionType;
import com.finance.tracker.entity.User;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.mapper.TransactionMapper;
import com.finance.tracker.repository.AccountRepository;
import com.finance.tracker.repository.BudgetRepository;
import com.finance.tracker.repository.GoalRepository;
import com.finance.tracker.repository.RecurringTransactionRepository;
import com.finance.tracker.repository.TransactionRepository;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(Transactional.TxType.SUPPORTS)
public class DashboardService {
    private static final DateTimeFormatter LABEL_FORMATTER = DateTimeFormatter.ofPattern("MMM d");

    private static final int FORECAST_DAYS = 7;
    private static final int SCHEDULE_ITERATION_LIMIT = 32;

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final BudgetRepository budgetRepository;
    private final GoalRepository goalRepository;
    private final RecurringTransactionRepository recurringTransactionRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(Transactional.TxType.REQUIRED)
    public DashboardSummaryDto getSummary() {
        User user = currentUser();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime monthEnd = monthStart.plusMonths(1).minusNanos(1);

        BigDecimal income = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.INCOME, monthStart, monthEnd));
        BigDecimal expense = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.EXPENSE, monthStart, monthEnd));
        BigDecimal netBalance = income.subtract(expense);
        BigDecimal totalBalance = accountRepository.findByUser(user).stream()
            .map(Account::getCurrentBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Budget> budgets = budgetRepository.findByUser(user);
        BigDecimal totalBudget = budgets.stream()
            .map(Budget::getLimitAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Goal> goals = goalRepository.findByUser(user);
        BigDecimal totalSavings = goals.stream()
            .map(Goal::getCurrentAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        int activeBudgets = budgets.size();
        int upcomingRecurring = (int) recurringTransactionRepository.findByUser(user).stream()
            .filter(RecurringTransaction::isActive)
            .filter(rec -> !rec.getNextRun().isBefore(now))
            .count();

        return new DashboardSummaryDto(
            income,
            expense,
            netBalance,
            totalBalance,
            totalBudget,
            totalSavings,
            activeBudgets,
            upcomingRecurring
        );
    }

    public List<CategorySpendingDto> getSpendingByCategory() {
        User user = currentUser();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime monthEnd = monthStart.plusMonths(1).minusNanos(1);
        return transactionRepository.sumSpendingByCategory(user, TransactionType.EXPENSE, monthStart, monthEnd);
    }

    public List<TrendPointDto> getIncomeVsExpenseTrend() {
        User user = currentUser();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime windowStart = now.minusDays(13).withHour(0).withMinute(0).withSecond(0).withNano(0);
        Map<LocalDate, TrendAccumulator> buckets = new LinkedHashMap<>();
        for (int i = 0; i < 14; i++) {
            LocalDate day = windowStart.toLocalDate().plusDays(i);
            buckets.put(day, new TrendAccumulator());
        }

        transactionRepository
            .findByUserAndTransactionDateBetween(user, windowStart, now)
            .forEach(tx -> {
                LocalDate date = tx.getTransactionDate().toLocalDate();
                TrendAccumulator accumulator = buckets.computeIfAbsent(date, d -> new TrendAccumulator());
                if (tx.getType() == TransactionType.INCOME) {
                    accumulator.addIncome(tx.getAmount());
                } else if (tx.getType() == TransactionType.EXPENSE) {
                    accumulator.addExpense(tx.getAmount());
                }
            });

        return buckets.entrySet().stream()
            .map(entry -> new TrendPointDto(
                entry.getKey().format(LABEL_FORMATTER),
                entry.getValue().income(),
                entry.getValue().expense()
            ))
            .toList();
    }

    public List<TransactionDto> getRecentTransactions() {
        User user = currentUser();
        return transactionRepository.findTop5ByUserOrderByTransactionDateDesc(user).stream()
            .map(TransactionMapper::toDto)
            .toList();
    }

    public List<RecurringItemDto> getUpcomingRecurring() {
        User user = currentUser();
        OffsetDateTime now = OffsetDateTime.now();
        return recurringTransactionRepository.findByUser(user).stream()
            .filter(RecurringTransaction::isActive)
            .filter(rec -> !rec.getNextRun().isBefore(now))
            .sorted(Comparator.comparing(RecurringTransaction::getNextRun))
            .limit(5)
            .map(rec -> new RecurringItemDto(
                rec.getId(),
                rec.getTitle(),
                rec.getAmount(),
                rec.getFrequency().name(),
                rec.getNextRun(),
                rec.getAccount().getName()
            ))
            .toList();
    }

    public List<BudgetProgressDto> getBudgetProgress() {
        User user = currentUser();
        List<Budget> budgets = budgetRepository.findByUser(user);
        return budgets.stream()
            .map(budget -> {
                BigDecimal limit = budget.getLimitAmount() != null ? budget.getLimitAmount() : BigDecimal.ZERO;
                BigDecimal spent = spentForBudget(user, budget);
                double progress = limit.compareTo(BigDecimal.ZERO) == 0
                    ? 0
                    : spent.divide(limit, 4, RoundingMode.HALF_UP).doubleValue();
                String categoryName = budget.getCategory() != null ? budget.getCategory().getName() : "Uncategorized";
                return new BudgetProgressDto(
                    budget.getId(),
                    categoryName,
                    limit,
                    spent,
                    clamp(progress)
                );
            })
            .toList();
    }

    public List<GoalProgressDto> getGoalsSummary() {
        User user = currentUser();
        List<Goal> goals = goalRepository.findByUser(user);
        return goals.stream()
            .map(goal -> {
                BigDecimal target = goal.getTargetAmount() != null ? goal.getTargetAmount() : BigDecimal.ZERO;
                BigDecimal current = goal.getCurrentAmount() != null ? goal.getCurrentAmount() : BigDecimal.ZERO;
                double progress = target.compareTo(BigDecimal.ZERO) == 0
                    ? 0
                    : current.divide(target, 4, RoundingMode.HALF_UP).doubleValue();
                return new GoalProgressDto(
                    goal.getId(),
                    goal.getName(),
                    target,
                    current,
                    clamp(progress),
                    goal.getStatus().name(),
                    goal.getDueDate()
                );
            })
            .toList();
    }

    public CashFlowForecastDto getCashFlowForecast() {
        User user = currentUser();
        OffsetDateTime now = OffsetDateTime.now();
        return buildForecastContext(user, now).forecast();
    }

    public FinancialHealthScoreDto getFinancialHealthScore() {
        User user = currentUser();
        OffsetDateTime now = OffsetDateTime.now();
        ForecastContext context = buildForecastContext(user, now);
        BigDecimal monthlyIncome = context.monthlyIncome();
        BigDecimal monthlyExpense = context.monthlyExpense();
        BigDecimal netBalance = monthlyIncome.subtract(monthlyExpense);
        BigDecimal totalBalance = context.totalBalance();
        BigDecimal upcomingExpenses = context.upcomingExpenses();
        LocalDate today = now.toLocalDate();
        int daysInMonth = today.lengthOfMonth();

        BigDecimal expensePerDay = daysInMonth > 0
            ? monthlyExpense.divide(BigDecimal.valueOf(daysInMonth), 6, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        BigDecimal bufferDays = expensePerDay.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.valueOf(daysInMonth)
            : totalBalance.divide(expensePerDay, 6, RoundingMode.HALF_UP);
        double bufferRatio = Math.min(1.0, bufferDays.doubleValue() / 30.0);

        BigDecimal positiveNetBalance = netBalance.max(BigDecimal.ZERO);
        BigDecimal savingsRate = monthlyIncome.compareTo(BigDecimal.ZERO) == 0
            ? BigDecimal.ZERO
            : positiveNetBalance.divide(monthlyIncome, 4, RoundingMode.HALF_UP);

        BigDecimal safeAmount = context.forecast().safeToSpend().amount();
        double coverageRatio = 1.0;
        if (upcomingExpenses.compareTo(BigDecimal.ZERO) > 0) {
            coverageRatio = Math.max(
                0.0,
                Math.min(
                    1.0,
                    safeAmount.divide(upcomingExpenses, 4, RoundingMode.HALF_UP).doubleValue()
                )
            );
        }

        int bufferScore = ratioToPercent(bufferRatio);
        int savingsScore = ratioToPercent(savingsRate.doubleValue());
        int coverageScore = ratioToPercent(coverageRatio);
        int overallScore = (bufferScore + savingsScore + coverageScore) / 3;

        List<HealthMetricDto> breakdown = List.of(
            new HealthMetricDto(
                "Emergency buffer",
                bufferDays.setScale(1, RoundingMode.HALF_UP).toPlainString() + " days of coverage",
                bufferDays.setScale(2, RoundingMode.HALF_UP),
                bufferScore
            ),
            new HealthMetricDto(
                "Savings rate",
                percentString(savingsRate) + " of income saved",
                savingsRate,
                savingsScore
            ),
            new HealthMetricDto(
                "Recurring coverage",
                percentString(BigDecimal.valueOf(coverageRatio)) + " of upcoming recurring commitments covered",
                BigDecimal.valueOf(coverageRatio),
                coverageScore
            )
        );

        List<String> suggestions = buildHealthSuggestions(
            bufferDays,
            savingsRate,
            coverageRatio,
            netBalance,
            safeAmount,
            upcomingExpenses
        );

        return new FinancialHealthScoreDto(overallScore, breakdown, suggestions);
    }

    private static int ratioToPercent(double ratio) {
        double normalized = Math.max(0, Math.min(1, ratio));
        return (int) Math.round(normalized * 100);
    }

    private static String percentString(BigDecimal ratio) {
        BigDecimal percent = ratio.multiply(BigDecimal.valueOf(100));
        return percent.setScale(0, RoundingMode.HALF_UP).toPlainString() + "%";
    }

    private List<String> buildHealthSuggestions(
        BigDecimal bufferDays,
        BigDecimal savingsRate,
        double coverageRatio,
        BigDecimal netBalance,
        BigDecimal safeAmount,
        BigDecimal upcomingExpenses
    ) {
        List<String> suggestions = new ArrayList<>();
        if (bufferDays.compareTo(BigDecimal.valueOf(7)) < 0) {
            suggestions.add("Build at least a week of runway before covering new spending.");
        }
        if (netBalance.compareTo(BigDecimal.ZERO) < 0) {
            suggestions.add("Expenses exceed income; trim discretionary categories for this month.");
        }
        if (savingsRate.compareTo(BigDecimal.valueOf(0.1)) < 0) {
            suggestions.add("Try to save at least 10% of your income to protect against surprises.");
        }
        if (coverageRatio < 1.0 && upcomingExpenses.compareTo(BigDecimal.ZERO) > 0) {
            suggestions.add("Safe-to-spend buffer is smaller than upcoming recurring commitments.");
        }
        if (suggestions.isEmpty()) {
            suggestions.add("Keep tracking income and commitments to preserve this momentum.");
        }
        return suggestions;
    }

    private ForecastContext buildForecastContext(User user, OffsetDateTime now) {
        LocalDate today = now.toLocalDate();
        int dayOfMonth = today.getDayOfMonth();
        int daysInMonth = today.lengthOfMonth();

        OffsetDateTime monthStart = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        OffsetDateTime monthEnd = monthStart.plusMonths(1).minusNanos(1);

        BigDecimal monthlyIncome = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.INCOME, monthStart, monthEnd));
        BigDecimal monthlyExpense = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.EXPENSE, monthStart, monthEnd));
        BigDecimal netToDate = monthlyIncome.subtract(monthlyExpense);
        BigDecimal dailyNetAverage = dayOfMonth > 0
            ? netToDate.divide(BigDecimal.valueOf(dayOfMonth), 4, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        BigDecimal daysRemaining = BigDecimal.valueOf(Math.max(daysInMonth - dayOfMonth, 0));
        BigDecimal futureNetEstimate = dailyNetAverage.multiply(daysRemaining);

        BigDecimal totalBalance = accountRepository.findByUser(user).stream()
            .map(Account::getCurrentBalance)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<RecurringTransaction> activeRecurring = recurringTransactionRepository.findByUser(user).stream()
            .filter(RecurringTransaction::isActive)
            .toList();
        Map<LocalDate, RecurringTotals> schedule = buildRecurringSchedule(activeRecurring, now, monthEnd);
        BigDecimal recurringImpact = schedule.values().stream()
            .map(RecurringTotals::net)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal projectedMonthlyNet = netToDate.add(futureNetEstimate).add(recurringImpact);
        BigDecimal projectedEndOfMonthBalance = totalBalance.add(futureNetEstimate).add(recurringImpact);

        BigDecimal baseDailyIncome = dayOfMonth > 0
            ? monthlyIncome.divide(BigDecimal.valueOf(dayOfMonth), 4, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        BigDecimal baseDailyExpense = dayOfMonth > 0
            ? monthlyExpense.divide(BigDecimal.valueOf(dayOfMonth), 4, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        List<DailyProjectionDto> dailyProjections = buildDailyProjections(today, baseDailyIncome, baseDailyExpense, schedule);
        BigDecimal recurringExpenseNextWeek = sumRecurringExpenses(schedule, today.plusDays(1), today.plusDays(FORECAST_DAYS));
        SafeToSpendDto safeToSpend = buildSafeToSpend(totalBalance, projectedEndOfMonthBalance, recurringExpenseNextWeek);
        List<RiskWarningDto> riskWarnings = buildWarnings(
            totalBalance,
            projectedEndOfMonthBalance,
            safeToSpend,
            recurringExpenseNextWeek,
            dailyNetAverage,
            monthlyIncome,
            monthlyExpense
        );

        CashFlowForecastDto forecast = new CashFlowForecastDto(
            projectedEndOfMonthBalance,
            projectedMonthlyNet,
            dailyNetAverage,
            dailyProjections,
            safeToSpend,
            riskWarnings
        );

        return new ForecastContext(
            forecast,
            monthlyIncome,
            monthlyExpense,
            dailyNetAverage,
            totalBalance,
            projectedEndOfMonthBalance,
            projectedMonthlyNet,
            futureNetEstimate,
            recurringExpenseNextWeek
        );
    }

    private double clamp(double value) {
        if (value < 0) {
            return 0;
        }
        return Math.min(1, value);
    }

    private User currentUser() {
        String email = currentUserProvider.getCurrentUsername();
        if (email == null) {
            throw new BadRequestException("Unable to resolve current user");
        }
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("User not found"));
    }

    private BigDecimal safeSum(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal spentForBudget(User user, Budget budget) {
        if (budget.getCategory() == null) {
            return BigDecimal.ZERO;
        }
        LocalDate start = LocalDate.of(budget.getYear(), budget.getMonth(), 1);
        OffsetDateTime from = OffsetDateTime.of(start, LocalTime.MIDNIGHT, ZoneOffset.UTC);
        OffsetDateTime to = OffsetDateTime.of(start.plusMonths(1).minusDays(1), LocalTime.MAX, ZoneOffset.UTC);
        return safeSum(transactionRepository.sumByCategoryAndPeriod(
            user,
            budget.getCategory().getId(),
            TransactionType.EXPENSE,
            from,
            to
        ));
    }

    private List<DailyProjectionDto> buildDailyProjections(
        LocalDate today,
        BigDecimal baseDailyIncome,
        BigDecimal baseDailyExpense,
        Map<LocalDate, RecurringTotals> schedule
    ) {
        List<DailyProjectionDto> projections = new ArrayList<>();
        for (int offset = 1; offset <= FORECAST_DAYS; offset++) {
            LocalDate target = today.plusDays(offset);
            RecurringTotals totals = schedule.get(target);
            BigDecimal recurringIncome = totals != null ? totals.getIncome() : BigDecimal.ZERO;
            BigDecimal recurringExpense = totals != null ? totals.getExpense() : BigDecimal.ZERO;
            BigDecimal projectedIncome = baseDailyIncome.add(recurringIncome);
            BigDecimal projectedExpense = baseDailyExpense.add(recurringExpense);
            BigDecimal netChange = projectedIncome.subtract(projectedExpense);
            projections.add(new DailyProjectionDto(target, projectedIncome, projectedExpense, netChange));
        }
        return projections;
    }

    private Map<LocalDate, RecurringTotals> buildRecurringSchedule(
        List<RecurringTransaction> items,
        OffsetDateTime from,
        OffsetDateTime to
    ) {
        Map<LocalDate, RecurringTotals> schedule = new LinkedHashMap<>();
        for (RecurringTransaction item : items) {
            OffsetDateTime pointer = item.getNextRun();
            int iterations = 0;
            while (pointer != null && !pointer.isAfter(to) && iterations < SCHEDULE_ITERATION_LIMIT) {
                if (!pointer.isBefore(from)) {
                    RecurringTotals totals = schedule.computeIfAbsent(pointer.toLocalDate(), (ignored) -> new RecurringTotals());
                    BigDecimal amount = item.getAmount() != null ? item.getAmount() : BigDecimal.ZERO;
                    if (item.getType() == TransactionType.INCOME) {
                        totals.addIncome(amount);
                    } else if (item.getType() == TransactionType.EXPENSE) {
                        totals.addExpense(amount);
                    }
                }
                pointer = nextOccurrence(pointer, item.getFrequency());
                iterations++;
            }
        }
        return schedule;
    }

    private BigDecimal sumRecurringExpenses(Map<LocalDate, RecurringTotals> schedule, LocalDate start, LocalDate end) {
        return schedule.entrySet().stream()
            .filter(entry -> !entry.getKey().isBefore(start) && !entry.getKey().isAfter(end))
            .map(entry -> entry.getValue().getExpense())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private record ForecastContext(
        CashFlowForecastDto forecast,
        BigDecimal monthlyIncome,
        BigDecimal monthlyExpense,
        BigDecimal dailyNetAverage,
        BigDecimal totalBalance,
        BigDecimal projectedEndOfMonthBalance,
        BigDecimal projectedMonthlyNet,
        BigDecimal futureNetEstimate,
        BigDecimal upcomingExpenses
    ) {}

    private SafeToSpendDto buildSafeToSpend(BigDecimal totalBalance, BigDecimal projectedBalance, BigDecimal upcomingExpenses) {
        BigDecimal safeAmount = projectedBalance.subtract(upcomingExpenses);
        String level;
        String message;
        if (safeAmount.compareTo(BigDecimal.ZERO) < 0) {
            level = "critical";
            message = "Funds will not cover the nearest scheduled expenses.";
        } else if (totalBalance.compareTo(BigDecimal.ZERO) == 0) {
            level = "caution";
            message = "No balance yet; track income before spending.";
        } else {
            BigDecimal healthyThreshold = totalBalance.multiply(BigDecimal.valueOf(0.25));
            if (safeAmount.compareTo(healthyThreshold) >= 0) {
                level = "healthy";
                message = "You have room to cover planned spending.";
            } else {
                level = "caution";
                message = "Buffer is tight; prioritize upcoming payments.";
            }
        }
        return new SafeToSpendDto(safeAmount, level, message);
    }

    private List<RiskWarningDto> buildWarnings(
        BigDecimal totalBalance,
        BigDecimal projectedBalance,
        SafeToSpendDto safeToSpend,
        BigDecimal upcomingExpenses,
        BigDecimal dailyNetAverage,
        BigDecimal monthlyIncome,
        BigDecimal monthlyExpense
    ) {
        List<RiskWarningDto> warnings = new ArrayList<>();
        if (projectedBalance.compareTo(BigDecimal.ZERO) < 0) {
            warnings.add(new RiskWarningDto(
                "Projected end-of-month balance drops below zero. Reduce spending or add income.",
                "critical"
            ));
        }
        if (dailyNetAverage.compareTo(BigDecimal.ZERO) < 0) {
            BigDecimal weeklyShortfall = dailyNetAverage.abs().multiply(BigDecimal.valueOf(FORECAST_DAYS));
            if (totalBalance.compareTo(weeklyShortfall) < 0) {
                warnings.add(new RiskWarningDto(
                    "Spending is outpacing income; available cash may run out within a week.",
                    "warning"
                ));
            }
        }
        if ("critical".equalsIgnoreCase(safeToSpend.level())) {
            warnings.add(new RiskWarningDto(
                "Safe-to-spend buffer is in the red; upcoming commitments exceed the forecasted balance.",
                "warning"
            ));
        }
        if (upcomingExpenses.compareTo(totalBalance) > 0 && totalBalance.compareTo(BigDecimal.ZERO) > 0) {
            warnings.add(new RiskWarningDto(
                "Scheduled recurring expenses for the coming week exceed current balance.",
                "warning"
            ));
        }
        if (monthlyIncome.compareTo(BigDecimal.ZERO) == 0 && monthlyExpense.compareTo(BigDecimal.ZERO) > 0) {
            warnings.add(new RiskWarningDto(
                "No income recorded this month; consider logging expected deposits.",
                "info"
            ));
        }
        return warnings;
    }

    private OffsetDateTime nextOccurrence(OffsetDateTime current, RecurringFrequency frequency) {
        if (current == null || frequency == null) {
            return null;
        }
        return switch (frequency) {
            case DAILY -> current.plusDays(1);
            case WEEKLY -> current.plusWeeks(1);
            case MONTHLY -> current.plusMonths(1);
            case YEARLY -> current.plusYears(1);
        };
    }

    private static final class RecurringTotals {
        private BigDecimal income = BigDecimal.ZERO;
        private BigDecimal expense = BigDecimal.ZERO;

        void addIncome(BigDecimal amount) {
            if (amount != null) {
                income = income.add(amount);
            }
        }

        void addExpense(BigDecimal amount) {
            if (amount != null) {
                expense = expense.add(amount);
            }
        }

        BigDecimal getIncome() {
            return income;
        }

        BigDecimal getExpense() {
            return expense;
        }

        BigDecimal net() {
            return income.subtract(expense);
        }
    }

    private static class TrendAccumulator {
        private BigDecimal income = BigDecimal.ZERO;
        private BigDecimal expense = BigDecimal.ZERO;

        void addIncome(BigDecimal amount) {
            if (amount != null) {
                income = income.add(amount);
            }
        }

        void addExpense(BigDecimal amount) {
            if (amount != null) {
                expense = expense.add(amount);
            }
        }

        BigDecimal income() {
            return income;
        }

        BigDecimal expense() {
            return expense;
        }
    }
}

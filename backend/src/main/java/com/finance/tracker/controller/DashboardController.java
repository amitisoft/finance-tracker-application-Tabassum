package com.finance.tracker.controller;

import com.finance.tracker.dto.dashboard.BudgetProgressDto;
import com.finance.tracker.dto.dashboard.CashFlowForecastDto;
import com.finance.tracker.dto.dashboard.CategorySpendingDto;
import com.finance.tracker.dto.dashboard.DashboardSummaryDto;
import com.finance.tracker.dto.dashboard.FinancialHealthScoreDto;
import com.finance.tracker.dto.dashboard.GoalProgressDto;
import com.finance.tracker.dto.dashboard.RecurringItemDto;
import com.finance.tracker.dto.dashboard.TrendPointDto;
import com.finance.tracker.dto.transaction.TransactionDto;
import com.finance.tracker.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<DashboardSummaryDto> summary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    @GetMapping("/spending-by-category")
    public ResponseEntity<List<CategorySpendingDto>> spendingByCategory() {
        return ResponseEntity.ok(dashboardService.getSpendingByCategory());
    }

    @GetMapping("/income-vs-expense")
    public ResponseEntity<List<TrendPointDto>> incomeVsExpense() {
        return ResponseEntity.ok(dashboardService.getIncomeVsExpenseTrend());
    }

    @GetMapping("/recent-transactions")
    public ResponseEntity<List<TransactionDto>> recentTransactions() {
        return ResponseEntity.ok(dashboardService.getRecentTransactions());
    }

    @GetMapping("/upcoming-recurring")
    public ResponseEntity<List<RecurringItemDto>> upcomingRecurring() {
        return ResponseEntity.ok(dashboardService.getUpcomingRecurring());
    }

    @GetMapping("/budget-progress")
    public ResponseEntity<List<BudgetProgressDto>> budgetProgress() {
        return ResponseEntity.ok(dashboardService.getBudgetProgress());
    }

    @GetMapping("/goals-summary")
    public ResponseEntity<List<GoalProgressDto>> goalsSummary() {
        return ResponseEntity.ok(dashboardService.getGoalsSummary());
    }

    @GetMapping("/forecast")
    public ResponseEntity<CashFlowForecastDto> forecast() {
        return ResponseEntity.ok(dashboardService.getCashFlowForecast());
    }

    @GetMapping("/health")
    public ResponseEntity<FinancialHealthScoreDto> health() {
        return ResponseEntity.ok(dashboardService.getFinancialHealthScore());
    }
}

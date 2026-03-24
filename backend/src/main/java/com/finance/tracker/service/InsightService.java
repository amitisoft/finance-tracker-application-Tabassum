package com.finance.tracker.service;

import com.finance.tracker.dto.dashboard.CategorySpendingDto;
import com.finance.tracker.dto.insights.HighestSpendingCategoryDto;
import com.finance.tracker.dto.insights.InsightCategoryChangeDto;
import com.finance.tracker.dto.insights.InsightWarningDto;
import com.finance.tracker.dto.insights.InsightsDto;
import com.finance.tracker.dto.insights.SavingsChangeDto;
import com.finance.tracker.entity.Transaction.TransactionType;
import com.finance.tracker.entity.User;
import com.finance.tracker.repository.TransactionRepository;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import com.finance.tracker.exception.BadRequestException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(Transactional.TxType.SUPPORTS)
public class InsightService {
    private static final BigDecimal EXPENSE_INCREASE_THRESHOLD = BigDecimal.valueOf(0.15);

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public InsightsDto getInsights() {
        User user = currentUser();
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime currentStart = monthStart(now);
        OffsetDateTime currentEnd = currentStart.plusMonths(1).minusNanos(1);
        OffsetDateTime previousStart = currentStart.minusMonths(1);
        OffsetDateTime previousEnd = currentStart.minusNanos(1);

        List<CategorySpendingDto> currentSpend = transactionRepository.sumSpendingByCategory(user, TransactionType.EXPENSE, currentStart, currentEnd);
        List<CategorySpendingDto> previousSpend = transactionRepository.sumSpendingByCategory(user, TransactionType.EXPENSE, previousStart, previousEnd);

        Map<Long, CategorySpendingDto> currentById = mapById(currentSpend);
        Map<Long, CategorySpendingDto> previousById = mapById(previousSpend);
        Set<Long> allCategoryIds = new HashSet<>();
        allCategoryIds.addAll(currentById.keySet());
        allCategoryIds.addAll(previousById.keySet());

        List<InsightCategoryChangeDto> categoryChanges = allCategoryIds.stream()
            .map(id -> {
                CategorySpendingDto current = currentById.get(id);
                CategorySpendingDto previous = previousById.get(id);
                BigDecimal currentAmount = current != null ? current.amount() : BigDecimal.ZERO;
                BigDecimal previousAmount = previous != null ? previous.amount() : BigDecimal.ZERO;
                String categoryName = current != null ? current.categoryName() : previous != null ? previous.categoryName() : "Uncategorized";
                BigDecimal change = currentAmount.subtract(previousAmount);
                return new InsightCategoryChangeDto(id, categoryName, previousAmount, currentAmount, change);
            })
            .sorted((a, b) -> b.change().abs().compareTo(a.change().abs()))
            .toList();

        BigDecimal currentIncome = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.INCOME, currentStart, currentEnd));
        BigDecimal previousIncome = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.INCOME, previousStart, previousEnd));
        BigDecimal currentExpense = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.EXPENSE, currentStart, currentEnd));
        BigDecimal previousExpense = safeSum(transactionRepository.sumByTypeBetween(user, TransactionType.EXPENSE, previousStart, previousEnd));

        BigDecimal currentSavings = currentIncome.subtract(currentExpense);
        BigDecimal previousSavings = previousIncome.subtract(previousExpense);
        BigDecimal savingsChange = currentSavings.subtract(previousSavings);

        HighestSpendingCategoryDto highestCategory = currentSpend.stream()
            .findFirst()
            .map(category -> new HighestSpendingCategoryDto(category.categoryId(), category.categoryName(), safeAmount(category.amount())))
            .orElse(new HighestSpendingCategoryDto(null, "No spending recorded", BigDecimal.ZERO));

        InsightWarningDto warning = buildExpenseWarning(previousExpense, currentExpense);

        return new InsightsDto(
            List.copyOf(categoryChanges),
            new SavingsChangeDto(previousSavings, currentSavings, savingsChange),
            highestCategory,
            warning
        );
    }

    private Map<Long, CategorySpendingDto> mapById(List<CategorySpendingDto> items) {
        return items.stream()
            .collect(Collectors.toMap(CategorySpendingDto::categoryId, item -> item));
    }

    private InsightWarningDto buildExpenseWarning(BigDecimal previousExpense, BigDecimal currentExpense) {
        if (previousExpense.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal delta = currentExpense.subtract(previousExpense);
            BigDecimal ratio = previousExpense.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : delta.divide(previousExpense, 4, RoundingMode.HALF_UP);
            if (ratio.compareTo(EXPENSE_INCREASE_THRESHOLD) > 0) {
                BigDecimal percent = ratio.multiply(BigDecimal.valueOf(100));
                String message = String.format(
                    "Expenses climbed %s%% compared to last month. Review high-impact categories.",
                    percent.setScale(1, RoundingMode.HALF_UP)
                );
                return new InsightWarningDto("warning", message);
            }
            return null;
        }
        if (currentExpense.compareTo(BigDecimal.ZERO) > 0) {
            String message = "Monthly spending started after a quiet period. Keep an eye on new categories.";
            return new InsightWarningDto("info", message);
        }
        return null;
    }

    private OffsetDateTime monthStart(OffsetDateTime source) {
        return source.withDayOfMonth(1).with(LocalTime.MIN);
    }

    private BigDecimal safeSum(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private BigDecimal safeAmount(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private User currentUser() {
        String email = currentUserProvider.getCurrentUsername();
        if (email == null) {
            throw new BadRequestException("Unable to resolve current user");
        }
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("User not found"));
    }
}

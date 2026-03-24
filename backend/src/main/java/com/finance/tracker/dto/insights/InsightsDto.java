package com.finance.tracker.dto.insights;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record InsightsDto(
    List<InsightCategoryChangeDto> categoryChanges,
    SavingsChangeDto savingsChange,
    HighestSpendingCategoryDto highestSpendingCategory,
    InsightWarningDto expenseWarning
) {
}

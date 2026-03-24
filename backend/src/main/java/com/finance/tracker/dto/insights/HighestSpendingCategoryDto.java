package com.finance.tracker.dto.insights;

import java.math.BigDecimal;

public record HighestSpendingCategoryDto(
    Long categoryId,
    String categoryName,
    BigDecimal amount
) {
}

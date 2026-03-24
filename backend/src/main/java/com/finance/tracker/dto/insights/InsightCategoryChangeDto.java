package com.finance.tracker.dto.insights;

import java.math.BigDecimal;

public record InsightCategoryChangeDto(
    Long categoryId,
    String categoryName,
    BigDecimal previousAmount,
    BigDecimal currentAmount,
    BigDecimal change
) {
}

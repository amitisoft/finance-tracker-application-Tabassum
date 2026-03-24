package com.finance.tracker.dto.reports;

import java.math.BigDecimal;

public record MonthlyTrendDto(
    String month,
    String label,
    BigDecimal income,
    BigDecimal expense,
    BigDecimal savings,
    BigDecimal savingsRate
) {
}

package com.finance.tracker.dto.reports;

import java.math.BigDecimal;

public record CategoryTrendPointDto(
    String month,
    String label,
    BigDecimal amount
) {
}

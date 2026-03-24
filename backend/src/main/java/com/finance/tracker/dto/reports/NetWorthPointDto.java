package com.finance.tracker.dto.reports;

import java.math.BigDecimal;

public record NetWorthPointDto(
    String month,
    String label,
    BigDecimal balance
) {
}

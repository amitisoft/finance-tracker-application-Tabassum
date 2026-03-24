package com.finance.tracker.dto.insights;

import java.math.BigDecimal;

public record SavingsChangeDto(
    BigDecimal previousSavings,
    BigDecimal currentSavings,
    BigDecimal change
) {
}

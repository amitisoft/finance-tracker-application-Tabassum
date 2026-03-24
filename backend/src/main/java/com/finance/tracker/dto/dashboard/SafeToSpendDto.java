package com.finance.tracker.dto.dashboard;

import java.math.BigDecimal;

public record SafeToSpendDto(BigDecimal amount, String level, String message) {
}

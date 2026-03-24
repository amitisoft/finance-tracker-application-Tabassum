package com.finance.tracker.dto.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailyProjectionDto(LocalDate date, BigDecimal projectedIncome, BigDecimal projectedExpense, BigDecimal netChange) {
}

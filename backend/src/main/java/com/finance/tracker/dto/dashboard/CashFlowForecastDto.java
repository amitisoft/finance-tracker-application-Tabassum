package com.finance.tracker.dto.dashboard;

import java.math.BigDecimal;
import java.util.List;

public record CashFlowForecastDto(
    BigDecimal projectedEndOfMonthBalance,
    BigDecimal projectedMonthlyNet,
    BigDecimal dailyNetAverage,
    List<DailyProjectionDto> dailyProjections,
    SafeToSpendDto safeToSpend,
    List<RiskWarningDto> riskWarnings
) {
}

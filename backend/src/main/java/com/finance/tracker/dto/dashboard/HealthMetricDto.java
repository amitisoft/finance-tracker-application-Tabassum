package com.finance.tracker.dto.dashboard;

import java.math.BigDecimal;

public record HealthMetricDto(
    String label,
    String detail,
    BigDecimal value,
    int score
) {}

package com.finance.tracker.dto.dashboard;

import java.util.List;

public record FinancialHealthScoreDto(
    int score,
    List<HealthMetricDto> breakdown,
    List<String> suggestions
) {}

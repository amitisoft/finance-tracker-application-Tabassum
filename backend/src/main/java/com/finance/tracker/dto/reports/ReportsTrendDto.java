package com.finance.tracker.dto.reports;

import java.util.List;

public record ReportsTrendDto(
    List<MonthlyTrendDto> monthlyAggregates,
    List<CategoryTrendDto> categoryTrends
) {
}

package com.finance.tracker.dto.reports;

import java.util.List;

public record CategoryTrendDto(
    Long categoryId,
    String categoryName,
    String color,
    List<CategoryTrendPointDto> points
) {
}

package com.finance.tracker.dto.rule;

import com.finance.tracker.entity.RuleAction;
import com.finance.tracker.entity.RuleMatchField;
import com.finance.tracker.entity.RuleOperator;

import java.time.OffsetDateTime;

public record RuleDto(
    Long id,
    String name,
    String description,
    RuleMatchField matchField,
    RuleOperator matchOperator,
    String matchValue,
    RuleAction action,
    Long categoryId,
    String categoryName,
    boolean active,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {}

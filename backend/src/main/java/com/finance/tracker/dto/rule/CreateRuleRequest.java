package com.finance.tracker.dto.rule;

import com.finance.tracker.entity.RuleAction;
import com.finance.tracker.entity.RuleMatchField;
import com.finance.tracker.entity.RuleOperator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRuleRequest(
    @NotBlank(message = "Name is required")
    String name,
    String description,
    @NotNull(message = "Match field is required")
    RuleMatchField matchField,
    @NotNull(message = "Match operator is required")
    RuleOperator matchOperator,
    @NotBlank(message = "Match value is required")
    String matchValue,
    @NotNull(message = "Action is required")
    RuleAction action,
    Long categoryId,
    Boolean active
) {}

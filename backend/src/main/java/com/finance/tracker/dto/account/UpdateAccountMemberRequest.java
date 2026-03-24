package com.finance.tracker.dto.account;

import com.finance.tracker.entity.AccountRole;
import jakarta.validation.constraints.NotNull;

public record UpdateAccountMemberRequest(
    @NotNull(message = "Role is required") AccountRole role
) {}

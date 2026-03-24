package com.finance.tracker.dto.account;

import com.finance.tracker.entity.AccountRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InviteAccountMemberRequest(
    @NotBlank(message = "Email is required") @Email(message = "Enter a valid email") String email,
    @NotNull(message = "Role is required") AccountRole role
) {}

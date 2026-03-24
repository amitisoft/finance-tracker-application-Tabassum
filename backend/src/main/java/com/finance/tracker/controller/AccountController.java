package com.finance.tracker.controller;

import com.finance.tracker.dto.account.AccountResponse;
import com.finance.tracker.dto.account.AccountTransferRequest;
import com.finance.tracker.dto.account.CreateAccountRequest;
import com.finance.tracker.dto.account.UpdateAccountRequest;
import com.finance.tracker.dto.account.AccountMemberResponse;
import com.finance.tracker.dto.account.InviteAccountMemberRequest;
import com.finance.tracker.dto.account.UpdateAccountMemberRequest;
import com.finance.tracker.entity.User;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import com.finance.tracker.service.AccountMembershipService;
import com.finance.tracker.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;
    private final CurrentUserProvider currentUserProvider;
    private final UserRepository userRepository;
    private final AccountMembershipService membershipService;

    public AccountController(
        AccountService accountService,
        CurrentUserProvider currentUserProvider,
        UserRepository userRepository,
        AccountMembershipService membershipService
    ) {
        this.accountService = accountService;
        this.currentUserProvider = currentUserProvider;
        this.userRepository = userRepository;
        this.membershipService = membershipService;
    }

    @GetMapping
    public List<AccountResponse> getAll() {
        return accountService.getAll(currentUserId());
    }

    @GetMapping("/{id}")
    public AccountResponse getOne(@PathVariable Long id) {
        return accountService.getOne(currentUserId(), id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(
            @Valid @RequestBody CreateAccountRequest request
    ) {
        return accountService.create(currentUserId(), request);
    }

    @PutMapping("/{id}")
    public AccountResponse update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAccountRequest request
    ) {
        return accountService.update(currentUserId(), id, request);
    }

    @PostMapping("/transfer")
    public Map<String, String> transfer(
            @Valid @RequestBody AccountTransferRequest request
    ) {
        accountService.transfer(currentUserId(), request);
        return Map.of("message", "Transfer completed successfully");
    }

    @PostMapping("/{id}/invite")
    public AccountMemberResponse invite(
        @PathVariable Long id,
        @Valid @RequestBody InviteAccountMemberRequest request
    ) {
        return membershipService.invite(id, request);
    }

    @GetMapping("/{id}/members")
    public List<AccountMemberResponse> members(@PathVariable Long id) {
        return membershipService.listMembers(id);
    }

    @PutMapping("/{id}/members/{userId}")
    public AccountMemberResponse updateMember(
        @PathVariable Long id,
        @PathVariable Long userId,
        @Valid @RequestBody UpdateAccountMemberRequest request
    ) {
        return membershipService.updateMemberRole(id, userId, request);
    }

    private Long currentUserId() {
        String email = currentUserProvider.getCurrentUsername();
        if (email == null) {
            throw new BadRequestException("Unable to resolve current user");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));
        return user.getId();
    }
}

package com.finance.tracker.service;

import com.finance.tracker.dto.account.AccountMemberResponse;
import com.finance.tracker.dto.account.InviteAccountMemberRequest;
import com.finance.tracker.dto.account.UpdateAccountMemberRequest;
import com.finance.tracker.entity.Account;
import com.finance.tracker.entity.AccountMember;
import com.finance.tracker.entity.AccountRole;
import com.finance.tracker.entity.User;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.exception.ConflictException;
import com.finance.tracker.exception.NotFoundException;
import com.finance.tracker.exception.ResourceNotFoundException;
import com.finance.tracker.exception.UnauthorizedException;
import com.finance.tracker.repository.AccountMemberRepository;
import com.finance.tracker.repository.AccountRepository;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class AccountMembershipService {
    private final AccountRepository accountRepository;
    private final AccountMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public AccountMembershipService(
            AccountRepository accountRepository,
            AccountMemberRepository memberRepository,
            UserRepository userRepository,
            CurrentUserProvider currentUserProvider
    ) {
        this.accountRepository = accountRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public List<AccountMemberResponse> listMembers(Long accountId) {
        Account account = findAccount(accountId);
        User current = currentUser();
        requireMembership(accountId, current);
        return memberRepository.findByAccountId(account.getId()).stream()
            .map(member -> toResponse(member, current))
            .toList();
    }

    @Transactional
    public AccountMemberResponse invite(Long accountId, InviteAccountMemberRequest request) {
        User inviter = currentUser();
        Account account = findAccount(accountId);
        AccountMember inviterMembership = requireMembership(accountId, inviter);
        ensureOwner(inviterMembership);

        String normalizedEmail = normalizeEmail(request.email());
        User invitee = userRepository.findByEmail(normalizedEmail)
            .orElseThrow(() -> new NotFoundException("User not found"));

        if (memberRepository.existsByAccountIdAndUserId(accountId, invitee.getId())) {
            throw new ConflictException("User is already a member of this account");
        }

        AccountMember member = new AccountMember();
        member.setAccount(account);
        member.setUser(invitee);
        member.setRole(request.role());
        member.setInvitedBy(inviter);
        member.setCreatedAt(OffsetDateTime.now());
        member.setUpdatedAt(OffsetDateTime.now());

        AccountMember saved = memberRepository.save(member);
        return toResponse(saved, inviter);
    }

    @Transactional
    public AccountMemberResponse updateMemberRole(Long accountId, Long memberUserId, UpdateAccountMemberRequest request) {
        User requester = currentUser();
        Account account = findAccount(accountId);
        AccountMember requesterMembership = requireMembership(accountId, requester);
        ensureOwner(requesterMembership);

        AccountMember targetMember = memberRepository.findByAccountIdAndUserId(accountId, memberUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

        if (targetMember.getRole() == AccountRole.OWNER && request.role() != AccountRole.OWNER) {
            long owners = memberRepository.countByAccountIdAndRole(accountId, AccountRole.OWNER);
            if (owners <= 1) {
                throw new BadRequestException("Account must have at least one owner");
            }
        }

        targetMember.setRole(request.role());
        targetMember.setUpdatedAt(OffsetDateTime.now());
        AccountMember updated = memberRepository.save(targetMember);
        return toResponse(updated, requester);
    }

    private AccountMemberResponse toResponse(AccountMember member, User currentUser) {
        AccountMemberResponse response = AccountMemberResponse.from(member);
        response.setCurrentUser(member.getUser().getId().equals(currentUser.getId()));
        return response;
    }

    private Account findAccount(Long accountId) {
        return accountRepository.findById(accountId)
            .orElseThrow(() -> new NotFoundException("Account not found"));
    }

    private AccountMember requireMembership(Long accountId, User user) {
        return memberRepository.findByAccountIdAndUserId(accountId, user.getId())
            .orElseThrow(() -> new UnauthorizedException("You do not have access to this account"));
    }

    private void ensureOwner(AccountMember membership) {
        if (membership.getRole() != AccountRole.OWNER) {
            throw new UnauthorizedException("Owner role is required for this action");
        }
    }

    private User currentUser() {
        String email = currentUserProvider.getCurrentUsername();
        if (email == null) {
            throw new BadRequestException("Unable to resolve current user");
        }
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("User not found"));
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase();
    }
}

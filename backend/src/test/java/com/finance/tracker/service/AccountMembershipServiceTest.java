package com.finance.tracker.service;

import com.finance.tracker.dto.account.InviteAccountMemberRequest;
import com.finance.tracker.dto.account.UpdateAccountMemberRequest;
import com.finance.tracker.entity.Account;
import com.finance.tracker.entity.AccountMember;
import com.finance.tracker.entity.AccountRole;
import com.finance.tracker.entity.User;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.exception.UnauthorizedException;
import com.finance.tracker.repository.AccountMemberRepository;
import com.finance.tracker.repository.AccountRepository;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountMembershipServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountMemberRepository memberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private AccountMembershipService membershipService;

    @Test
    void inviteRequiresOwnerRole() {
        long accountId = 11L;
        Account account = new Account();
        account.setId(accountId);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        User currentUser = new User();
        currentUser.setId(42L);
        currentUser.setEmail("owner@example.com");
        when(currentUserProvider.getCurrentUsername()).thenReturn("owner@example.com");
        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.of(currentUser));

        AccountMember membership = new AccountMember();
        membership.setRole(AccountRole.VIEWER);
        when(memberRepository.findByAccountIdAndUserId(accountId, currentUser.getId())).thenReturn(Optional.of(membership));

        InviteAccountMemberRequest request = new InviteAccountMemberRequest("invitee@example.com", AccountRole.EDITOR);

        assertThatThrownBy(() -> membershipService.invite(accountId, request)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void inviteCreatesMemberWhenOwner() {
        long accountId = 12L;
        Account existing = new Account();
        existing.setId(accountId);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(existing));

        User inviter = new User();
        inviter.setId(21L);
        inviter.setEmail("owner@example.com");
        when(currentUserProvider.getCurrentUsername()).thenReturn("owner@example.com");
        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.of(inviter));

        AccountMember inviterMembership = new AccountMember();
        inviterMembership.setRole(AccountRole.OWNER);
        when(memberRepository.findByAccountIdAndUserId(accountId, inviter.getId())).thenReturn(Optional.of(inviterMembership));

        User invitee = new User();
        invitee.setId(22L);
        invitee.setEmail("invitee@example.com");
        invitee.setDisplayName("Invitee");
        when(userRepository.findByEmail("invitee@example.com")).thenReturn(Optional.of(invitee));
        when(memberRepository.existsByAccountIdAndUserId(accountId, invitee.getId())).thenReturn(false);
        when(memberRepository.save(any(AccountMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InviteAccountMemberRequest request = new InviteAccountMemberRequest("invitee@example.com", AccountRole.EDITOR);
        var response = membershipService.invite(accountId, request);

        assertThat(response).isNotNull();
        assertThat(response.getEmail()).isEqualTo("invitee@example.com");
        assertThat(response.getRole()).isEqualTo(AccountRole.EDITOR);
        verify(memberRepository).save(any(AccountMember.class));
    }

    @Test
    void updateMemberRoleCannotDemoteLastOwner() {
        long accountId = 13L;
        long memberUserId = 99L;

        Account account = new Account();
        account.setId(accountId);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(account));

        User requester = new User();
        requester.setId(50L);
        requester.setEmail("owner@example.com");
        when(currentUserProvider.getCurrentUsername()).thenReturn("owner@example.com");
        when(userRepository.findByEmail("owner@example.com")).thenReturn(Optional.of(requester));

        AccountMember requesterMembership = new AccountMember();
        requesterMembership.setRole(AccountRole.OWNER);
        when(memberRepository.findByAccountIdAndUserId(accountId, requester.getId()))
            .thenReturn(Optional.of(requesterMembership));

        AccountMember targetMember = new AccountMember();
        targetMember.setRole(AccountRole.OWNER);
        when(memberRepository.findByAccountIdAndUserId(accountId, memberUserId))
            .thenReturn(Optional.of(targetMember));

        when(memberRepository.countByAccountIdAndRole(accountId, AccountRole.OWNER)).thenReturn(1L);

        UpdateAccountMemberRequest request = new UpdateAccountMemberRequest(AccountRole.EDITOR);

        assertThatThrownBy(() -> membershipService.updateMemberRole(accountId, memberUserId, request))
            .isInstanceOf(BadRequestException.class)
            .hasMessageContaining("Account must have at least one owner");
    }
}

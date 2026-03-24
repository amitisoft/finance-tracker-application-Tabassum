package com.finance.tracker.dto.account;

import com.finance.tracker.entity.AccountMember;
import com.finance.tracker.entity.AccountRole;

import java.time.OffsetDateTime;

public class AccountMemberResponse {
    private Long userId;
    private String email;
    private String displayName;
    private AccountRole role;
    private Long invitedById;
    private String invitedByName;
    private OffsetDateTime createdAt;
    private boolean currentUser;

    public static AccountMemberResponse from(AccountMember member) {
        AccountMemberResponse response = new AccountMemberResponse();
        response.setUserId(member.getUser().getId());
        response.setEmail(member.getUser().getEmail());
        response.setDisplayName(member.getUser().getDisplayName());
        response.setRole(member.getRole());
        if (member.getInvitedBy() != null) {
            response.setInvitedById(member.getInvitedBy().getId());
            response.setInvitedByName(member.getInvitedBy().getDisplayName());
        }
        response.setCreatedAt(member.getCreatedAt());
        return response;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public AccountRole getRole() {
        return role;
    }

    public void setRole(AccountRole role) {
        this.role = role;
    }

    public Long getInvitedById() {
        return invitedById;
    }

    public void setInvitedById(Long invitedById) {
        this.invitedById = invitedById;
    }

    public String getInvitedByName() {
        return invitedByName;
    }

    public void setInvitedByName(String invitedByName) {
        this.invitedByName = invitedByName;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isCurrentUser() {
        return currentUser;
    }

    public void setCurrentUser(boolean currentUser) {
        this.currentUser = currentUser;
    }
}

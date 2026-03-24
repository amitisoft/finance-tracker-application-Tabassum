package com.finance.tracker.dto.account;

import com.finance.tracker.entity.Account;
import com.finance.tracker.entity.AccountRole;
import com.finance.tracker.entity.AccountType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class AccountResponse {

    private Long id;
    private Long userId;
    private String name;
    private AccountType type;
    private BigDecimal openingBalance;
    private BigDecimal currentBalance;
    private String institutionName;
    private String currency;
    private OffsetDateTime lastUpdatedAt;
    private AccountRole currentUserRole;

    public static AccountResponse from(Account account, AccountRole currentUserRole) {
        AccountResponse r = new AccountResponse();
        r.setId(account.getId());
        r.setUserId(account.getUserId());
        r.setName(account.getName());
        r.setType(account.getType());
        r.setOpeningBalance(account.getOpeningBalance());
        r.setCurrentBalance(account.getCurrentBalance());
        r.setInstitutionName(account.getInstitutionName());
        r.setCurrency(account.getCurrency());
        r.setLastUpdatedAt(account.getLastUpdatedAt());
        r.setCurrentUserRole(currentUserRole);
        return r;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AccountType getType() {
        return type;
    }

    public void setType(AccountType type) {
        this.type = type;
    }

    public BigDecimal getOpeningBalance() {
        return openingBalance;
    }

    public void setOpeningBalance(BigDecimal openingBalance) {
        this.openingBalance = openingBalance;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance;
    }

    public String getInstitutionName() {
        return institutionName;
    }

    public void setInstitutionName(String institutionName) {
        this.institutionName = institutionName;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public OffsetDateTime getLastUpdatedAt() {
        return lastUpdatedAt;
    }

    public void setLastUpdatedAt(OffsetDateTime lastUpdatedAt) {
        this.lastUpdatedAt = lastUpdatedAt;
    }

    public AccountRole getCurrentUserRole() {
        return currentUserRole;
    }

    public void setCurrentUserRole(AccountRole currentUserRole) {
        this.currentUserRole = currentUserRole;
    }
}

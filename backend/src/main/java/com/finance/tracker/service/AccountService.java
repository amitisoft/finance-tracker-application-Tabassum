package com.finance.tracker.service;

import com.finance.tracker.dto.account.AccountResponse;
import com.finance.tracker.dto.account.AccountTransferRequest;
import com.finance.tracker.dto.account.CreateAccountRequest;
import com.finance.tracker.dto.account.UpdateAccountRequest;
import com.finance.tracker.dto.transaction.CreateTransactionRequest;
import com.finance.tracker.entity.Account;
import com.finance.tracker.entity.AccountMember;
import com.finance.tracker.entity.AccountRole;
import com.finance.tracker.entity.User;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.exception.ResourceNotFoundException;
import com.finance.tracker.repository.AccountMemberRepository;
import com.finance.tracker.repository.AccountRepository;
import com.finance.tracker.repository.TransactionRepository;
import com.finance.tracker.repository.UserRepository;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final AccountMemberRepository accountMemberRepository;
    private final UserRepository userRepository;

    public AccountService(
        AccountRepository accountRepository,
        TransactionRepository transactionRepository,
        TransactionService transactionService,
        AccountMemberRepository accountMemberRepository,
        UserRepository userRepository
    ) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.transactionService = transactionService;
        this.accountMemberRepository = accountMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAll(Long userId) {
        return accountMemberRepository.findByUserId(userId).stream()
                .map(member -> AccountResponse.from(member.getAccount(), member.getRole()))
                .sorted(Comparator.comparing(AccountResponse::getName))
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getOne(Long userId, Long accountId) {
        AccountMember membership = requireMembership(accountId, userId);
        return AccountResponse.from(membership.getAccount(), membership.getRole());
    }

    @Transactional
    public AccountResponse create(Long userId, CreateAccountRequest request) {
        if (request.getOpeningBalance() == null || request.getOpeningBalance().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Opening balance must be 0 or greater");
        }

        Account account = new Account();
        account.setUserId(userId);
        account.setName(request.getName().trim());
        account.setType(request.getType());
        account.setOpeningBalance(request.getOpeningBalance());
        account.setCurrency(normalizeCurrency(request.getCurrency()));
        account.setCurrentBalance(request.getOpeningBalance());
        account.setInstitutionName(blankToNull(request.getInstitutionName()));
        account.setLastUpdatedAt(OffsetDateTime.now());

        Account saved = accountRepository.save(account);
        attachOwnerMember(saved, userId);
        return AccountResponse.from(saved, AccountRole.OWNER);
    }

    @Transactional
    public AccountResponse update(Long userId, Long accountId, UpdateAccountRequest request) {
        AccountMember membership = requireMembership(accountId, userId);
        ensureOwner(membership);
        Account account = membership.getAccount();
        boolean balanceChanged = account.getCurrentBalance().compareTo(request.getCurrentBalance()) != 0;
        if (balanceChanged && transactionRepository.existsByAccountOrTransferAccount(account, account)) {
            throw new BadRequestException(
                "Current balance is ledger-managed once transactions exist. Edit the transaction history instead.");
        }

        account.setName(request.getName().trim());
        account.setType(request.getType());
        account.setCurrency(normalizeCurrency(request.getCurrency()));
        account.setCurrentBalance(request.getCurrentBalance());
        if (balanceChanged) {
            account.setOpeningBalance(request.getCurrentBalance());
        }
        account.setInstitutionName(blankToNull(request.getInstitutionName()));
        account.setLastUpdatedAt(OffsetDateTime.now());

        Account updated = accountRepository.save(account);
        return AccountResponse.from(updated, membership.getRole());
    }

    @Transactional
    public void transfer(Long userId, AccountTransferRequest request) {
        if (request.getFromAccountId().equals(request.getToAccountId())) {
            throw new BadRequestException("Source and destination accounts must be different");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Transfer amount must be greater than 0");
        }

        AccountMember fromMember = requireMembership(request.getFromAccountId(), userId);
        ensureEditorOrOwner(fromMember);
        AccountMember toMember = requireMembership(request.getToAccountId(), userId);
        ensureEditorOrOwner(toMember);
        Account from = fromMember.getAccount();
        Account to = toMember.getAccount();

        transactionService.createTransaction(new CreateTransactionRequest(
            from.getId(),
            request.getAmount(),
            transferDescription(from.getName(), to.getName(), request.getNote()),
            "TRANSFER",
            null,
            to.getId(),
            null,
            null,
            null,
            OffsetDateTime.now(),
            null
        ));
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        return value.trim();
    }

    private String normalizeCurrency(String value) {
        if (value == null) return "USD";
        return value.trim().toUpperCase();
    }

    private String transferDescription(String fromName, String toName, @Nullable String note) {
        if (note != null && !note.trim().isEmpty()) {
            return note.trim();
        }
        return "Transfer from " + fromName + " to " + toName;
    }

    private void attachOwnerMember(Account account, Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        AccountMember member = new AccountMember();
        member.setAccount(account);
        member.setUser(user);
        member.setRole(AccountRole.OWNER);
        accountMemberRepository.save(member);
    }

    private AccountMember requireMembership(Long accountId, Long userId) {
        return accountMemberRepository.findByAccountIdAndUserId(accountId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Account not found"));
    }

    private void ensureOwner(AccountMember membership) {
        if (membership.getRole() != AccountRole.OWNER) {
            throw new BadRequestException("Owner role is required for this action");
        }
    }

    private void ensureEditorOrOwner(AccountMember membership) {
        if (membership.getRole() != AccountRole.OWNER && membership.getRole() != AccountRole.EDITOR) {
            throw new BadRequestException("Editor or owner role is required for this action");
        }
    }
}

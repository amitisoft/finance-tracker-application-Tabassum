package com.finance.tracker.service;

import com.finance.tracker.dto.transaction.CreateTransactionRequest;
import com.finance.tracker.exception.UnauthorizedException;
import com.finance.tracker.repository.AccountMemberRepository;
import com.finance.tracker.repository.AccountRepository;
import com.finance.tracker.repository.CategoryRepository;
import com.finance.tracker.repository.TransactionRepository;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AccountMemberRepository accountMemberRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @Mock
    private TransactionRuleEngine ruleEngine;

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private TransactionService transactionService;

    @Test
    void createTransaction_requiresEditorOrOwner_role() {
        when(currentUserProvider.getCurrentUsername()).thenReturn("viewer@example.com");
        com.finance.tracker.entity.User user = new com.finance.tracker.entity.User();
        user.setId(77L);
        user.setEmail("viewer@example.com");
        when(userRepository.findByEmail("viewer@example.com")).thenReturn(Optional.of(user));
        when(accountMemberRepository.findByAccountIdAndUserId(99L, user.getId())).thenReturn(Optional.empty());

        CreateTransactionRequest request = new CreateTransactionRequest(
            99L,
            new BigDecimal("123.45"),
            "Test expense",
            "EXPENSE",
            10L,
            null,
            null,
            null,
            null,
            OffsetDateTime.now(),
            null
        );

        assertThrows(UnauthorizedException.class, () -> transactionService.createTransaction(request));
    }
}

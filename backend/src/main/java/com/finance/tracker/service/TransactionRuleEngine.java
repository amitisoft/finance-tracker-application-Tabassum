package com.finance.tracker.service;

import com.finance.tracker.entity.RuleAction;
import com.finance.tracker.entity.RuleMatchField;
import com.finance.tracker.entity.RuleOperator;
import com.finance.tracker.entity.Transaction;
import com.finance.tracker.entity.TransactionRule;
import com.finance.tracker.entity.User;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.repository.TransactionRuleRepository;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionRuleEngine {
    private final TransactionRuleRepository ruleRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public void applyRules(Transaction transaction) {
        User user = currentUser();
        List<TransactionRule> rules = ruleRepository.findByUserAndActiveTrueOrderByUpdatedAtDesc(user);
        for (TransactionRule rule : rules) {
            if (matches(rule, transaction) && applyAction(rule, transaction)) {
                break;
            }
        }
    }

    private boolean matches(TransactionRule rule, Transaction transaction) {
        String pattern = rule.getMatchValue();
        if (pattern == null || pattern.isBlank()) {
            return false;
        }
        RuleMatchField field = rule.getMatchField();
        RuleOperator operator = rule.getMatchOperator();
        String normalizedPattern = pattern.trim();
        return switch (field) {
            case DESCRIPTION -> matchText(transaction.getDescription(), normalizedPattern, operator);
            case MERCHANT -> matchText(transaction.getMerchant(), normalizedPattern, operator);
            case TAGS -> matchTags(transaction.getTags(), normalizedPattern, operator);
        };
    }

    private boolean matchText(String source, String pattern, RuleOperator operator) {
        if (source == null) {
            return false;
        }
        String normalizedSource = source.toLowerCase();
        String normalizedPattern = pattern.toLowerCase();
        return switch (operator) {
            case CONTAINS -> normalizedSource.contains(normalizedPattern);
            case EQUALS -> normalizedSource.equals(normalizedPattern);
        };
    }

    private boolean matchTags(String tags, String pattern, RuleOperator operator) {
        if (tags == null || tags.isBlank()) {
            return false;
        }
        String normalizedPattern = pattern.toLowerCase();
        return Arrays.stream(tags.split(","))
            .map(String::trim)
            .filter(tag -> !tag.isEmpty())
            .map(String::toLowerCase)
            .anyMatch(tag -> operator == RuleOperator.CONTAINS ? tag.contains(normalizedPattern) : tag.equals(normalizedPattern));
    }

    private boolean applyAction(TransactionRule rule, Transaction transaction) {
        if (rule.getAction() == RuleAction.ASSIGN_CATEGORY) {
            if (transaction.getCategory() == null && rule.getCategory() != null) {
                transaction.setCategory(rule.getCategory());
                return true;
            }
        }
        return false;
    }

    private User currentUser() {
        String email = currentUserProvider.getCurrentUsername();
        if (email == null) {
            throw new BadRequestException("Unable to resolve current user");
        }
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("User not found"));
    }
}

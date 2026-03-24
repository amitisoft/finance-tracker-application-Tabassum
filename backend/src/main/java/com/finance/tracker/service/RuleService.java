package com.finance.tracker.service;

import com.finance.tracker.dto.rule.CreateRuleRequest;
import com.finance.tracker.dto.rule.RuleDto;
import com.finance.tracker.dto.rule.UpdateRuleRequest;
import com.finance.tracker.entity.Category;
import com.finance.tracker.entity.RuleAction;
import com.finance.tracker.entity.RuleMatchField;
import com.finance.tracker.entity.RuleOperator;
import com.finance.tracker.entity.TransactionRule;
import com.finance.tracker.entity.User;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.repository.CategoryRepository;
import com.finance.tracker.repository.TransactionRuleRepository;
import com.finance.tracker.repository.UserRepository;
import com.finance.tracker.security.CurrentUserProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RuleService {
    private final TransactionRuleRepository ruleRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public List<RuleDto> listRules() {
        User user = currentUser();
        return ruleRepository.findByUser(user).stream().map(this::toDto).toList();
    }

    public RuleDto getRule(Long id) {
        User user = currentUser();
        TransactionRule rule = findRule(id, user);
        return toDto(rule);
    }

    public RuleDto createRule(@Valid CreateRuleRequest request) {
        User user = currentUser();
        TransactionRule rule = new TransactionRule();
        applyRequest(
            rule,
            request.name(),
            request.description(),
            request.matchField(),
            request.matchOperator(),
            request.matchValue(),
            request.action(),
            request.categoryId(),
            request.active(),
            user,
            true
        );
        rule.setUser(user);
        TransactionRule saved = ruleRepository.save(rule);
        return toDto(saved);
    }

    public RuleDto updateRule(Long id, @Valid UpdateRuleRequest request) {
        User user = currentUser();
        TransactionRule existing = findRule(id, user);
        applyRequest(
            existing,
            request.name(),
            request.description(),
            request.matchField(),
            request.matchOperator(),
            request.matchValue(),
            request.action(),
            request.categoryId(),
            request.active(),
            user,
            false
        );
        TransactionRule updated = ruleRepository.save(existing);
        return toDto(updated);
    }

    public void deleteRule(Long id) {
        User user = currentUser();
        TransactionRule existing = findRule(id, user);
        ruleRepository.delete(existing);
    }

    private void applyRequest(
        TransactionRule rule,
        String name,
        String description,
        RuleMatchField matchField,
        RuleOperator matchOperator,
        String matchValue,
        RuleAction action,
        Long categoryId,
        Boolean active,
        User user,
        boolean isCreation
    ) {
        rule.setName(name.trim());
        rule.setDescription(description);
        rule.setMatchField(matchField);
        rule.setMatchOperator(matchOperator);
        rule.setMatchValue(matchValue.trim());
        rule.setAction(action);
        rule.setActive(active != null ? active : (isCreation ? true : rule.isActive()));

        if (action == RuleAction.ASSIGN_CATEGORY) {
            rule.setCategory(resolveCategory(categoryId, user));
        } else {
            rule.setCategory(null);
        }
    }

    private Category resolveCategory(Long categoryId, User user) {
        if (categoryId == null) {
            throw new BadRequestException("Category is required for assignment rules");
        }
        return categoryRepository.findByIdAndUser(categoryId, user)
            .orElseThrow(() -> new BadRequestException("Category not found"));
    }

    private RuleDto toDto(TransactionRule rule) {
        Category category = rule.getCategory();
        return new RuleDto(
            rule.getId(),
            rule.getName(),
            rule.getDescription(),
            rule.getMatchField(),
            rule.getMatchOperator(),
            rule.getMatchValue(),
            rule.getAction(),
            category != null ? category.getId() : null,
            category != null ? category.getName() : null,
            rule.isActive(),
            rule.getCreatedAt(),
            rule.getUpdatedAt()
        );
    }

    private TransactionRule findRule(Long id, User user) {
        return ruleRepository.findById(id)
            .filter(rule -> rule.getUser().getId().equals(user.getId()))
            .orElseThrow(() -> new BadRequestException("Rule not found"));
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

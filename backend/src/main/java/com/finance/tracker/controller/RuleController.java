package com.finance.tracker.controller;

import com.finance.tracker.dto.rule.CreateRuleRequest;
import com.finance.tracker.dto.rule.RuleDto;
import com.finance.tracker.dto.rule.UpdateRuleRequest;
import com.finance.tracker.service.RuleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
public class RuleController {
    private final RuleService ruleService;

    @GetMapping
    public ResponseEntity<List<RuleDto>> list() {
        return ResponseEntity.ok(ruleService.listRules());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RuleDto> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ruleService.getRule(id));
    }

    @PostMapping
    public ResponseEntity<RuleDto> create(@Valid @RequestBody CreateRuleRequest request) {
        return ResponseEntity.ok(ruleService.createRule(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RuleDto> update(@PathVariable Long id, @Valid @RequestBody UpdateRuleRequest request) {
        return ResponseEntity.ok(ruleService.updateRule(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ruleService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }
}

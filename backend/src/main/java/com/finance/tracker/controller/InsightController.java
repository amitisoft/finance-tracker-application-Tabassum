package com.finance.tracker.controller;

import com.finance.tracker.dto.insights.InsightsDto;
import com.finance.tracker.service.InsightService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
@RequiredArgsConstructor
public class InsightController {
    private final InsightService insightService;

    @GetMapping
    public ResponseEntity<InsightsDto> insights() {
        return ResponseEntity.ok(insightService.getInsights());
    }
}

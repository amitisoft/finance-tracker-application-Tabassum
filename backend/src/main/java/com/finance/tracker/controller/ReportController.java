package com.finance.tracker.controller;

import com.finance.tracker.dto.dashboard.TrendPointDto;
import com.finance.tracker.dto.reports.AccountBalanceReport;
import com.finance.tracker.dto.reports.CategorySpendReport;
import com.finance.tracker.dto.reports.NetWorthPointDto;
import com.finance.tracker.dto.reports.ReportsTrendDto;
import com.finance.tracker.dto.reports.ReportFilter;
import com.finance.tracker.entity.Transaction;
import com.finance.tracker.exception.BadRequestException;
import com.finance.tracker.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reportService;

    @GetMapping("/category-spend")
    public ResponseEntity<List<CategorySpendReport>> categorySpend(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
        @RequestParam(required = false) Long accountId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String transactionType
    ) {
        ReportFilter filter = buildFilter(startDate, endDate, accountId, categoryId, transactionType);
        return ResponseEntity.ok(reportService.categorySpend(filter));
    }

    @GetMapping("/income-vs-expense")
    public ResponseEntity<List<TrendPointDto>> incomeVsExpense(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
        @RequestParam(required = false) Long accountId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String transactionType
    ) {
        ReportFilter filter = buildFilter(startDate, endDate, accountId, categoryId, transactionType);
        return ResponseEntity.ok(reportService.incomeVsExpense(filter));
    }

    @GetMapping("/account-balance-trend")
    public ResponseEntity<List<AccountBalanceReport>> accountBalanceTrend(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
        @RequestParam(required = false) Long accountId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String transactionType
    ) {
        ReportFilter filter = buildFilter(startDate, endDate, accountId, categoryId, transactionType);
        return ResponseEntity.ok(reportService.accountBalanceTrend(filter));
    }

    @GetMapping("/trends")
    public ResponseEntity<ReportsTrendDto> trends(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
        @RequestParam(required = false) Long accountId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String transactionType
    ) {
        ReportFilter filter = buildFilter(startDate, endDate, accountId, categoryId, transactionType);
        return ResponseEntity.ok(reportService.trends(filter));
    }

    @GetMapping("/net-worth")
    public ResponseEntity<List<NetWorthPointDto>> netWorth(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
        @RequestParam(required = false) Long accountId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String transactionType
    ) {
        ReportFilter filter = buildFilter(startDate, endDate, accountId, categoryId, transactionType);
        return ResponseEntity.ok(reportService.netWorthTrend(filter));
    }

    @GetMapping("/export/csv")
    public ResponseEntity<ByteArrayResource> exportCsv(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime endDate,
        @RequestParam(required = false) Long accountId,
        @RequestParam(required = false) Long categoryId,
        @RequestParam(required = false) String transactionType
    ) {
        ReportFilter filter = buildFilter(startDate, endDate, accountId, categoryId, transactionType);
        byte[] payload = reportService.exportCsv(filter);
        ByteArrayResource resource = new ByteArrayResource(payload);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.setContentDisposition(ContentDisposition.attachment().filename("finance-reports.csv").build());
        return ResponseEntity.ok().headers(headers).body(resource);
    }

    private ReportFilter buildFilter(
        OffsetDateTime startDate,
        OffsetDateTime endDate,
        Long accountId,
        Long categoryId,
        String transactionType
    ) {
        return new ReportFilter(startDate, endDate, accountId, categoryId, parseType(transactionType));
    }

    private Transaction.TransactionType parseType(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Transaction.TransactionType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid transaction type");
        }
    }
}

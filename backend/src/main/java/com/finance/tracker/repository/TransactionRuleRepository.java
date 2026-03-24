package com.finance.tracker.repository;

import com.finance.tracker.entity.TransactionRule;
import com.finance.tracker.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionRuleRepository extends JpaRepository<TransactionRule, Long> {
    List<TransactionRule> findByUser(User user);

    List<TransactionRule> findByUserAndActiveTrueOrderByUpdatedAtDesc(User user);
}

package com.finance.tracker.repository;

import com.finance.tracker.entity.AccountMember;
import com.finance.tracker.entity.AccountRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AccountMemberRepository extends JpaRepository<AccountMember, Long> {
    Optional<AccountMember> findByAccountIdAndUserId(Long accountId, Long userId);

    List<AccountMember> findByAccountId(Long accountId);

    List<AccountMember> findByUserId(Long userId);

    boolean existsByAccountIdAndUserId(Long accountId, Long userId);

    long countByAccountIdAndRole(Long accountId, AccountRole role);

    @Query("select m.account.id from AccountMember m where m.user.id = :userId")
    List<Long> findAccountIdsByUserId(@Param("userId") Long userId);
}

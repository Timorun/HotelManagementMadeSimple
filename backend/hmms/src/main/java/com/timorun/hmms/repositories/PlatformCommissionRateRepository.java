package com.timorun.hmms.repositories;

import com.timorun.hmms.entities.PlatformCommissionRate;
import com.timorun.hmms.entities.PlatformCommissionRateId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlatformCommissionRateRepository extends JpaRepository<PlatformCommissionRate, PlatformCommissionRateId> {
    List<PlatformCommissionRate> findAllByOrderByChannelAscValidFromAsc();

    List<PlatformCommissionRate> findByChannelOrderByValidFromAsc(String channel);
}

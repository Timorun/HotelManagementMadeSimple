package com.timorun.hmms.services;

import com.timorun.hmms.dto.PriceQuote;
import com.timorun.hmms.dto.RateResponse;
import com.timorun.hmms.dto.SetRatesRequest;
import com.timorun.hmms.entities.SuiteRate;
import com.timorun.hmms.repositories.SuiteRateRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Nightly prices per suite and date, and the price of a stay (the sum of its nights).
 */
@Service
public class RateService {
    static final int MAX_RANGE_DAYS = 731;
    private static final BigDecimal MAX_PRICE = new BigDecimal("100000");
    private static final int UPSERT_CHUNK = 500;

    private final SuiteRateRepository rateRepository;
    private final SuiteRepository suiteRepository;
    private final EntityManager entityManager;

    public RateService(SuiteRateRepository rateRepository, SuiteRepository suiteRepository, EntityManager entityManager) {
        this.rateRepository = rateRepository;
        this.suiteRepository = suiteRepository;
        this.entityManager = entityManager;
    }

    /** Prices of all suites between two dates (both inclusive). */
    public List<RateResponse> listRates(LocalDate from, LocalDate to) {
        validateRange(from, to);
        return rateRepository.findByRateDateBetweenOrderBySuiteIdAscRateDateAsc(from, to).stream()
                .map(rate -> new RateResponse(rate.getSuiteId(), rate.getRateDate(), rate.getPrice()))
                .toList();
    }

    /**
     * Sets the price of the given suites on every date in the range (optionally only on some
     * weekdays), or clears those prices when the price is null.
     *
     * @return the number of suite-nights changed
     */
    @Transactional
    public int setRates(SetRatesRequest request) {
        if (request.getSuiteIds() == null || request.getSuiteIds().isEmpty()) {
            throw new IllegalArgumentException("Choose at least one suite");
        }
        Set<Long> suiteIds = new HashSet<>(request.getSuiteIds());
        if (suiteRepository.findAllById(suiteIds).size() != suiteIds.size()) {
            throw new IllegalArgumentException("Unknown suite");
        }
        validateRange(request.getFrom(), request.getTo());
        Set<Integer> weekdays = request.getWeekdays() == null ? Set.of() : new HashSet<>(request.getWeekdays());
        if (weekdays.stream().anyMatch(day -> day == null || day < 1 || day > 7)) {
            throw new IllegalArgumentException("Weekdays are numbered 1 (Monday) to 7 (Sunday)");
        }
        BigDecimal price = request.getPrice();
        if (price != null) {
            if (price.signum() < 0 || price.compareTo(MAX_PRICE) > 0) {
                throw new IllegalArgumentException("The price must be between 0 and " + MAX_PRICE.toPlainString());
            }
            price = price.setScale(2, RoundingMode.HALF_UP);
        }

        List<LocalDate> dates = request.getFrom().datesUntil(request.getTo().plusDays(1))
                .filter(date -> weekdays.isEmpty() || weekdays.contains(date.getDayOfWeek().getValue()))
                .toList();
        if (dates.isEmpty()) {
            return 0;
        }
        if (price == null) {
            return rateRepository.deleteRates(suiteIds, dates);
        }
        upsert(suiteIds, dates, price);
        return suiteIds.size() * dates.size();
    }

    /** Price of a stay in one suite. */
    public PriceQuote quote(Long suiteId, LocalDate checkIn, LocalDate checkOut) {
        return quotes(List.of(suiteId), checkIn, checkOut).get(suiteId);
    }

    /** Price of the same stay in several suites, with one query. */
    public Map<Long, PriceQuote> quotes(Collection<Long> suiteIds, LocalDate checkIn, LocalDate checkOut) {
        if (checkIn == null || checkOut == null || !checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException("Check-out must be after check-in");
        }
        int nights = (int) ChronoUnit.DAYS.between(checkIn, checkOut);
        Map<Long, List<SuiteRate>> ratesBySuite = suiteIds.isEmpty() ? Map.of()
                : rateRepository.findBySuiteIdInAndRateDateBetween(suiteIds, checkIn, checkOut.minusDays(1)).stream()
                        .collect(Collectors.groupingBy(SuiteRate::getSuiteId));
        Map<Long, PriceQuote> quotes = new HashMap<>();
        for (Long suiteId : suiteIds) {
            List<SuiteRate> rates = ratesBySuite.getOrDefault(suiteId, List.of());
            BigDecimal total = rates.size() == nights
                    ? rates.stream().map(SuiteRate::getPrice).reduce(BigDecimal.ZERO, BigDecimal::add)
                    : null;
            quotes.put(suiteId, new PriceQuote(total, nights));
        }
        return quotes;
    }

    private void upsert(Set<Long> suiteIds, List<LocalDate> dates, BigDecimal price) {
        List<Object[]> rows = new ArrayList<>();
        for (Long suiteId : suiteIds) {
            for (LocalDate date : dates) {
                rows.add(new Object[] {suiteId, date});
            }
        }
        for (int start = 0; start < rows.size(); start += UPSERT_CHUNK) {
            List<Object[]> chunk = rows.subList(start, Math.min(rows.size(), start + UPSERT_CHUNK));
            StringBuilder sql = new StringBuilder("INSERT INTO suite_rates (suite_id, rate_date, price) VALUES ");
            for (int i = 0; i < chunk.size(); i++) {
                sql.append(i == 0 ? "" : ", ")
                        .append("(?").append(3 * i + 1).append(", ?").append(3 * i + 2).append(", ?").append(3 * i + 3).append(")");
            }
            sql.append(" ON CONFLICT (suite_id, rate_date) DO UPDATE SET price = EXCLUDED.price");
            Query query = entityManager.createNativeQuery(sql.toString());
            for (int i = 0; i < chunk.size(); i++) {
                query.setParameter(3 * i + 1, chunk.get(i)[0]);
                query.setParameter(3 * i + 2, chunk.get(i)[1]);
                query.setParameter(3 * i + 3, price);
            }
            query.executeUpdate();
        }
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("Choose a start and end date");
        }
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("The end date must be on or after the start date");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("Choose at most " + MAX_RANGE_DAYS + " days at a time");
        }
    }
}

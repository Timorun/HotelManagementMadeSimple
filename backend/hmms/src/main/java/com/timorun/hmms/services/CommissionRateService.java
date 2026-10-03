package com.timorun.hmms.services;

import com.timorun.hmms.dto.CommissionRateDto;
import com.timorun.hmms.entities.PlatformCommissionRate;
import com.timorun.hmms.repositories.PlatformCommissionRateRepository;
import com.timorun.hmms.util.Channels;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;

/**
 * Commission % per platform, each with the date it applies from. A booking uses the rate that was
 * valid on the day it was booked, so when booking.com raises its rate the owner adds the new rate
 * from that date and older bookings keep the old one. Direct bookings pay no commission; a
 * platform without rates of its own uses those of "other".
 */
@Service
public class CommissionRateService {
    /** The platforms the owner sets rates for, in display order. */
    public static final List<String> PLATFORMS = List.of(Channels.BOOKING_COM, "airbnb", "expedia", Channels.OTHER);
    /** Valid-from date of a platform's starting rate, which also covers every older booking. */
    public static final LocalDate SINCE_THE_START = LocalDate.of(2000, 1, 1);
    private static final BigDecimal MAX_RATE = BigDecimal.valueOf(100);

    private final PlatformCommissionRateRepository repository;

    public CommissionRateService(PlatformCommissionRateRepository repository) {
        this.repository = repository;
    }

    public List<CommissionRateDto> list() {
        return repository.findAllByOrderByChannelAscValidFromAsc().stream()
                .map(rate -> new CommissionRateDto(rate.getChannel(), rate.getValidFrom(), rate.getRate()))
                .toList();
    }

    /** All rates at once, to price the commission of many bookings without a query each. */
    public Rates rates() {
        Map<String, NavigableMap<LocalDate, BigDecimal>> byChannel = new HashMap<>();
        for (PlatformCommissionRate rate : repository.findAll()) {
            byChannel.computeIfAbsent(rate.getChannel(), key -> new TreeMap<>()).put(rate.getValidFrom(), rate.getRate());
        }
        return new Rates(byChannel);
    }

    /** Adds a rate from a date, or changes the rate that starts on that date. */
    @Transactional
    public CommissionRateDto save(CommissionRateDto request) {
        String channel = request.channel() == null ? null : Channels.normalize(request.channel());
        if (channel == null || !PLATFORMS.contains(channel)) {
            throw new IllegalArgumentException("Choose one of the platforms: " + String.join(", ", PLATFORMS));
        }
        if (request.rate() == null || request.rate().signum() < 0 || request.rate().compareTo(MAX_RATE) > 0) {
            throw new IllegalArgumentException("The commission must be between 0 and 100%");
        }
        LocalDate validFrom = request.validFrom() != null ? request.validFrom() : SINCE_THE_START;
        BigDecimal rate = request.rate().setScale(2, RoundingMode.HALF_UP);
        repository.save(new PlatformCommissionRate(channel, validFrom, rate));
        return new CommissionRateDto(channel, validFrom, rate);
    }

    /** Removes a dated rate change; the starting rate of a platform can only be changed. */
    @Transactional
    public void delete(String channel, LocalDate validFrom) {
        String normalized = Channels.normalize(channel);
        List<PlatformCommissionRate> rates = repository.findByChannelOrderByValidFromAsc(normalized);
        PlatformCommissionRate rate = rates.stream()
                .filter(candidate -> candidate.getValidFrom().equals(validFrom))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No " + normalized + " rate starts on " + validFrom));
        if (rate == rates.get(0)) {
            throw new IllegalArgumentException("The starting rate can't be removed; change it instead");
        }
        repository.delete(rate);
    }

    /** Rates per platform; {@link #percentFor} gives the % for a booking made on a date. */
    public static final class Rates {
        private final Map<String, NavigableMap<LocalDate, BigDecimal>> byChannel;

        public Rates(Map<String, NavigableMap<LocalDate, BigDecimal>> byChannel) {
            this.byChannel = byChannel;
        }

        public BigDecimal percentFor(String channel, LocalDate bookedOn) {
            String normalized = Channels.normalize(channel);
            if (Channels.DIRECT.equals(normalized)) {
                return BigDecimal.ZERO;
            }
            NavigableMap<LocalDate, BigDecimal> rates = byChannel.getOrDefault(normalized, byChannel.get(Channels.OTHER));
            if (rates == null || rates.isEmpty()) {
                return BigDecimal.ZERO;
            }
            Map.Entry<LocalDate, BigDecimal> rate = rates.floorEntry(bookedOn != null ? bookedOn : LocalDate.now());
            // A booking from before the first rate's start date uses the first rate
            return rate != null ? rate.getValue() : rates.firstEntry().getValue();
        }

        /** Commission on an amount the guest paid, rounded to cents. */
        public BigDecimal commissionOn(BigDecimal amount, String channel, LocalDate bookedOn) {
            if (amount == null) {
                return BigDecimal.ZERO;
            }
            return amount.multiply(percentFor(channel, bookedOn)).divide(MAX_RATE, 2, RoundingMode.HALF_UP);
        }
    }
}

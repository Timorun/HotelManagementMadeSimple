package com.timorun.hmms.services;

import com.timorun.hmms.dto.AnalyticsReportResponse;
import com.timorun.hmms.dto.MonthlyAnalyticsResponse;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
        private final ReservationRepository reservationRepository;
        private final SuiteRepository suiteRepository;

        private static final Set<ReservationStatus> REVENUE_STATUSES = EnumSet.of(
                        ReservationStatus.CONFIRMED,
                        ReservationStatus.CHECKED_IN,
                        ReservationStatus.CHECKED_OUT
        );

        public AnalyticsService(ReservationRepository reservationRepository, SuiteRepository suiteRepository) {
                this.reservationRepository = reservationRepository;
                this.suiteRepository = suiteRepository;
        }

        /**
         * Get analytics for a specific month.
         */
        public MonthlyAnalyticsResponse getMonthlyAnalytics(YearMonth month) {
                LocalDate startDate = month.atDay(1);
                LocalDate endDate = month.atEndOfMonth();

                PeriodStats currentStats = calculatePeriodStats(startDate, endDate);

                YearMonth previousMonth = month.minusMonths(1);
                LocalDate prevStartDate = previousMonth.atDay(1);
                LocalDate prevEndDate = previousMonth.atEndOfMonth();
                PeriodStats previousStats = calculatePeriodStats(prevStartDate, prevEndDate);

                Double revenueChange = calculatePercentageChange(previousStats.totalRevenue, currentStats.totalRevenue);
                Double avgPriceChange = calculatePercentageChange(previousStats.averageDailyRate, currentStats.averageDailyRate);
                Double occupancyChange = currentStats.occupancyPercentage - previousStats.occupancyPercentage;

                return MonthlyAnalyticsResponse.builder()
                                .month(month)
                                .totalRevenue(currentStats.totalRevenue)
                                .occupancyPercentage(currentStats.occupancyPercentage)
                                .averagePricePerNight(currentStats.averageDailyRate)
                                .totalReservations(currentStats.totalReservations)
                                .totalNights(currentStats.occupiedNights)
                                .previousMonthRevenue(previousStats.totalRevenue)
                                .previousMonthOccupancy(previousStats.occupancyPercentage)
                                .previousMonthAvgPrice(previousStats.averageDailyRate)
                                .revenueChange(revenueChange)
                                .occupancyChange(occupancyChange)
                                .avgPriceChange(avgPriceChange)
                                .build();
        }

        /**
         * Get analytics report for an arbitrary date range.
         */
        public AnalyticsReportResponse getAnalyticsReport(LocalDate from, LocalDate to) {
                if (from == null || to == null) {
                        throw new IllegalArgumentException("From and to dates are required");
                }
                if (from.isAfter(to)) {
                        throw new IllegalArgumentException("From date must be before or equal to to date");
                }

                PeriodStats periodStats = calculatePeriodStats(from, to);
                PeriodSummary periodSummary = calculatePeriodSummary(from, to);

                return AnalyticsReportResponse.builder()
                                .fromDate(from)
                                .toDate(to)
                                .totalRevenue(periodStats.totalRevenue)
                                .occupancyPercentage(periodStats.occupancyPercentage)
                                .averageDailyRate(periodStats.averageDailyRate)
                                .revenuePerAvailableNight(periodStats.revenuePerAvailableNight)
                                .totalReservations(periodStats.totalReservations)
                                .totalNights(periodStats.occupiedNights)
                                .availableNights(periodStats.availableNights)
                                .averageLengthOfStay(periodSummary.averageLengthOfStay)
                                .cancellationRate(periodSummary.cancellationRate)
                                .cancelledReservations(periodSummary.cancelledReservations)
                                .reservationsStartingInPeriod(periodSummary.reservationsStartingInPeriod)
                                .revenueByChannel(periodStats.revenueByChannel)
                                .build();
        }

        private PeriodStats calculatePeriodStats(LocalDate startDate, LocalDate endDate) {
                List<Reservation> reservations = reservationRepository
                                .findByCheckInBeforeAndCheckOutAfter(endDate.plusDays(1), startDate)
                                .stream()
                                .filter(this::isRevenueReservation)
                                .collect(Collectors.toList());

                BigDecimal totalRevenue = reservations.stream()
                                .map(reservation -> calculateRevenueInPeriod(reservation, startDate, endDate))
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                .setScale(2, RoundingMode.HALF_UP);

                int totalNightsOccupied = reservations.stream()
                                .mapToInt(r -> calculateNightsInPeriod(r, startDate, endDate))
                                .sum();

                int totalAvailableNights = calculateTotalAvailableNights(startDate, endDate);

                double occupancyPercentage = totalAvailableNights > 0
                                ? (totalNightsOccupied * 100.0) / totalAvailableNights
                                : 0.0;
                occupancyPercentage = roundToTwoDecimals(occupancyPercentage);

                BigDecimal averageDailyRate = totalNightsOccupied > 0
                                ? totalRevenue.divide(BigDecimal.valueOf(totalNightsOccupied), 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;

                BigDecimal revenuePerAvailableNight = totalAvailableNights > 0
                                ? totalRevenue.divide(BigDecimal.valueOf(totalAvailableNights), 2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO;

                Map<String, BigDecimal> revenueByChannel = reservations.stream()
                                .collect(Collectors.groupingBy(
                                                reservation -> normalizeChannel(reservation.getChannel()),
                                                LinkedHashMap::new,
                                                Collectors.reducing(
                                                                BigDecimal.ZERO,
                                                                reservation -> calculateRevenueInPeriod(reservation, startDate, endDate),
                                                                BigDecimal::add
                                                )
                                ));
                revenueByChannel.replaceAll((channel, value) -> value.setScale(2, RoundingMode.HALF_UP));

                PeriodStats stats = new PeriodStats();
                stats.totalRevenue = totalRevenue;
                stats.occupancyPercentage = occupancyPercentage;
                stats.averageDailyRate = averageDailyRate;
                stats.revenuePerAvailableNight = revenuePerAvailableNight;
                stats.totalReservations = reservations.size();
                stats.occupiedNights = totalNightsOccupied;
                stats.availableNights = totalAvailableNights;
                stats.revenueByChannel = revenueByChannel;
                return stats;
        }

        private PeriodSummary calculatePeriodSummary(LocalDate startDate, LocalDate endDate) {
                List<Reservation> reservationsStartingInPeriod = reservationRepository.findByCheckInBetween(startDate, endDate);

                List<Reservation> completedOrActiveReservations = reservationsStartingInPeriod.stream()
                                .filter(this::isRevenueReservation)
                                .collect(Collectors.toList());

                double averageLengthOfStay = completedOrActiveReservations.stream()
                                .mapToLong(this::calculateReservationNights)
                                .average()
                                .orElse(0.0);

                long cancelledReservations = reservationsStartingInPeriod.stream()
                                .filter(r -> r.getStatus() == ReservationStatus.CANCELLED)
                                .count();

                double cancellationRate = reservationsStartingInPeriod.isEmpty()
                                ? 0.0
                                : (cancelledReservations * 100.0) / reservationsStartingInPeriod.size();

                PeriodSummary summary = new PeriodSummary();
                summary.averageLengthOfStay = roundToTwoDecimals(averageLengthOfStay);
                summary.cancellationRate = roundToTwoDecimals(cancellationRate);
                summary.cancelledReservations = (int) cancelledReservations;
                summary.reservationsStartingInPeriod = reservationsStartingInPeriod.size();
                return summary;
        }

        private boolean isRevenueReservation(Reservation reservation) {
                return reservation != null
                                && reservation.getStatus() != null
                                && REVENUE_STATUSES.contains(reservation.getStatus());
        }

        private int calculateTotalAvailableNights(LocalDate startDate, LocalDate endDate) {
                long daysInRange = ChronoUnit.DAYS.between(startDate, endDate.plusDays(1));
                long activeSuiteCount = suiteRepository.findAll().stream()
                                .filter(suite -> Boolean.TRUE.equals(suite.getActive()))
                                .count();
                return (int) (activeSuiteCount * daysInRange);
        }

        private BigDecimal calculateRevenueInPeriod(Reservation reservation, LocalDate periodStart, LocalDate periodEnd) {
                if (reservation == null || reservation.getPriceTotal() == null) {
                        return BigDecimal.ZERO;
                }

                int reservationNights = calculateReservationNights(reservation);
                int nightsInPeriod = calculateNightsInPeriod(reservation, periodStart, periodEnd);

                if (reservationNights <= 0 || nightsInPeriod <= 0) {
                        return BigDecimal.ZERO;
                }
                if (reservationNights == nightsInPeriod) {
                        return reservation.getPriceTotal();
                }

                return reservation.getPriceTotal()
                                .multiply(BigDecimal.valueOf(nightsInPeriod))
                                .divide(BigDecimal.valueOf(reservationNights), 4, RoundingMode.HALF_UP);
        }

        private int calculateReservationNights(Reservation reservation) {
                if (reservation == null || reservation.getCheckIn() == null || reservation.getCheckOut() == null) {
                        return 0;
                }
                long nights = ChronoUnit.DAYS.between(reservation.getCheckIn(), reservation.getCheckOut());
                return (int) Math.max(0, nights);
        }

        private String normalizeChannel(String channel) {
                if (channel == null || channel.isBlank()) {
                        return "other";
                }
                return channel.trim().toLowerCase();
        }

        private double roundToTwoDecimals(double value) {
                return Math.round(value * 100.0) / 100.0;
        }

        /**
         * Calculate how many nights of a reservation fall within a given period.
         */
        private int calculateNightsInPeriod(Reservation reservation, LocalDate periodStart, LocalDate periodEnd) {
                LocalDate effectiveStart = reservation.getCheckIn().isBefore(periodStart)
                                ? periodStart
                                : reservation.getCheckIn();
                LocalDate effectiveEnd = reservation.getCheckOut().isAfter(periodEnd.plusDays(1))
                                ? periodEnd.plusDays(1)
                                : reservation.getCheckOut();

                if (effectiveStart.isBefore(effectiveEnd)) {
                        return (int) ChronoUnit.DAYS.between(effectiveStart, effectiveEnd);
                }
                return 0;
        }

        /**
         * Calculate percentage change between two values.
         */
        private Double calculatePercentageChange(BigDecimal oldValue, BigDecimal newValue) {
                BigDecimal safeNewValue = newValue == null ? BigDecimal.ZERO : newValue;

                if (oldValue == null || oldValue.compareTo(BigDecimal.ZERO) == 0) {
                        return safeNewValue.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
                }

                BigDecimal change = safeNewValue.subtract(oldValue);
                BigDecimal percentageChange = change
                                .divide(oldValue, 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100));
                return percentageChange.doubleValue();
        }

        private static class PeriodStats {
                BigDecimal totalRevenue = BigDecimal.ZERO;
                Double occupancyPercentage = 0.0;
                BigDecimal averageDailyRate = BigDecimal.ZERO;
                BigDecimal revenuePerAvailableNight = BigDecimal.ZERO;
                Integer totalReservations = 0;
                Integer occupiedNights = 0;
                Integer availableNights = 0;
                Map<String, BigDecimal> revenueByChannel = new LinkedHashMap<>();
        }

        private static class PeriodSummary {
                Double averageLengthOfStay = 0.0;
                Double cancellationRate = 0.0;
                Integer cancelledReservations = 0;
                Integer reservationsStartingInPeriod = 0;
        }
}

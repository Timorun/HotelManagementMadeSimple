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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    private final ReservationRepository reservationRepository;
    private final SuiteRepository suiteRepository;

    private static final Set<ReservationStatus> STAY_STATUSES = EnumSet.of(
            ReservationStatus.CONFIRMED,
            ReservationStatus.CHECKED_IN,
            ReservationStatus.CHECKED_OUT
    );
    private static final int MAX_DAYS_IN_REPORT = 730;
    private static final int TOP_REVENUE_DAY_COUNT = 3;
    private static final String COMPARISON_MODE_SAME_DATES_LAST_YEAR = "SAME_DATES_LAST_YEAR";
    private static final String COMPARISON_MODE_PREVIOUS_EQUAL_DAYS = "PREVIOUS_EQUAL_DAYS";
    private static final String COMPARISON_MODE_CUSTOM_RANGE = "CUSTOM_RANGE";

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
        AnalyticsReportResponse.SummaryMetrics currentSummary = computePeriod(startDate, endDate, false, null).summary;

        YearMonth previousMonth = month.minusMonths(1);
        LocalDate prevStartDate = previousMonth.atDay(1);
        LocalDate prevEndDate = previousMonth.atEndOfMonth();
        AnalyticsReportResponse.SummaryMetrics previousSummary = computePeriod(prevStartDate, prevEndDate, false, null).summary;

        return MonthlyAnalyticsResponse.builder()
                .month(month)
                .totalRevenue(currentSummary.getTotalRevenue())
                .occupancyPercentage(currentSummary.getOccupancyPercentage())
                .averagePricePerNight(currentSummary.getAverageDailyRate())
                .totalReservations(currentSummary.getReservationsOverlappingPeriod())
                .totalNights(currentSummary.getOccupiedNights())
                .previousMonthRevenue(previousSummary.getTotalRevenue())
                .previousMonthOccupancy(previousSummary.getOccupancyPercentage())
                .previousMonthAvgPrice(previousSummary.getAverageDailyRate())
                .revenueChange(calculatePercentageChange(previousSummary.getTotalRevenue(), currentSummary.getTotalRevenue()))
                .occupancyChange(roundToTwoDecimals(currentSummary.getOccupancyPercentage() - previousSummary.getOccupancyPercentage()))
                .avgPriceChange(calculatePercentageChange(previousSummary.getAverageDailyRate(), currentSummary.getAverageDailyRate()))
                .build();
    }

    /**
     * Get advanced analytics report for an arbitrary date range.
     */
    public AnalyticsReportResponse getAnalyticsReport(LocalDate from, LocalDate to) {
        return getAnalyticsReport(from, to, false);
    }

    /**
     * Get advanced analytics report for an arbitrary date range.
     * Comparison can be enabled to include baseline periods and delta metrics.
     */
    public AnalyticsReportResponse getAnalyticsReport(LocalDate from, LocalDate to, boolean includeComparison) {
        return getAnalyticsReport(from, to, includeComparison, null, null, null, null);
    }

    /**
     * Get advanced analytics report with optional comparison controls and nationality filtering.
     */
    public AnalyticsReportResponse getAnalyticsReport(
            LocalDate from,
            LocalDate to,
            boolean includeComparison,
            String comparisonMode,
            LocalDate comparisonFrom,
            LocalDate comparisonTo,
            String nationalityCode) {
        validateDateRange(from, to);
        String normalizedNationalityCode = normalizeNationalityCode(nationalityCode);

        int daysInPeriod = inclusiveDays(from, to);
        ComparisonPeriod comparisonPeriod = includeComparison
                ? resolveComparisonPeriod(from, to, daysInPeriod, comparisonMode, comparisonFrom, comparisonTo)
                : null;

        PeriodComputation currentPeriod = computePeriod(from, to, true, normalizedNationalityCode);
        PeriodComputation previousPeriod = includeComparison
                ? computePeriod(comparisonPeriod.fromDate, comparisonPeriod.toDate, false, normalizedNationalityCode)
                : null;

        AnalyticsReportResponse.DeltaMetrics deltas = includeComparison
                ? buildDeltas(currentPeriod.summary, previousPeriod.summary)
                : null;

        return AnalyticsReportResponse.builder()
                .fromDate(from)
                .toDate(to)
                .daysInPeriod(daysInPeriod)
                .currency("EUR")
                .comparisonFromDate(includeComparison ? comparisonPeriod.fromDate : null)
                .comparisonToDate(includeComparison ? comparisonPeriod.toDate : null)
                .comparisonMode(includeComparison ? comparisonPeriod.mode : null)
                .summary(currentPeriod.summary)
                .previousPeriodSummary(includeComparison ? previousPeriod.summary : null)
                .deltas(deltas)
                .dailyTrend(currentPeriod.dailyTrend)
                .channelPerformance(currentPeriod.channelPerformance)
                .reservationStatusBreakdown(currentPeriod.statusBreakdown)
                .topRevenueDays(currentPeriod.topRevenueDays)
                .insights(buildInsights(currentPeriod, deltas, includeComparison))
                .build();
    }

    private ComparisonPeriod resolveComparisonPeriod(
            LocalDate from,
            LocalDate to,
            int daysInPeriod,
            String comparisonMode,
            LocalDate comparisonFrom,
            LocalDate comparisonTo) {
        String resolvedMode = normalizeComparisonMode(comparisonMode);

        if (COMPARISON_MODE_CUSTOM_RANGE.equals(resolvedMode)) {
            if (comparisonFrom == null || comparisonTo == null) {
                throw new IllegalArgumentException("comparisonFrom and comparisonTo are required for CUSTOM_RANGE mode");
            }
            validateDateRange(comparisonFrom, comparisonTo);
            return new ComparisonPeriod(comparisonFrom, comparisonTo, COMPARISON_MODE_CUSTOM_RANGE);
        }

        if (COMPARISON_MODE_PREVIOUS_EQUAL_DAYS.equals(resolvedMode)) {
            LocalDate previousTo = from.minusDays(1);
            LocalDate previousFrom = previousTo.minusDays(daysInPeriod - 1L);
            return new ComparisonPeriod(previousFrom, previousTo, COMPARISON_MODE_PREVIOUS_EQUAL_DAYS);
        }

        LocalDate previousYearFrom = from.minusYears(1);
        LocalDate previousYearTo = to.minusYears(1);
        validateDateRange(previousYearFrom, previousYearTo);
        return new ComparisonPeriod(previousYearFrom, previousYearTo, COMPARISON_MODE_SAME_DATES_LAST_YEAR);
    }

    private PeriodComputation computePeriod(LocalDate from, LocalDate to, boolean includeDetailedData, String nationalityCode) {
        int activeSuiteCount = getActiveSuiteCount();
        int daysInPeriod = inclusiveDays(from, to);
        int availableNights = activeSuiteCount * daysInPeriod;

        List<Reservation> overlappingReservations = findOverlappingReservations(from, to, nationalityCode);
        List<Reservation> stayReservations = overlappingReservations.stream()
                .filter(this::isStayReservation)
                .collect(Collectors.toList());

        List<ReservationSlice> slices = stayReservations.stream()
                .map(reservation -> buildSlice(reservation, from, to))
                .filter(slice -> slice.nightsInPeriod > 0)
                .collect(Collectors.toList());

        BigDecimal totalRevenue = slices.stream()
                .map(slice -> slice.revenueInPeriod)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        int occupiedNights = slices.stream().mapToInt(slice -> slice.nightsInPeriod).sum();

        List<Reservation> reservationsStartingInPeriod = findReservationsStartingInPeriod(from, to, nationalityCode);
        int startingReservationCount = reservationsStartingInPeriod.size();
        int cancelledReservations = countByStatus(reservationsStartingInPeriod, ReservationStatus.CANCELLED);

        double occupancyPercentage = availableNights > 0
                ? (occupiedNights * 100.0) / availableNights
                : 0.0;
        BigDecimal averageDailyRate = occupiedNights > 0
                ? totalRevenue.divide(BigDecimal.valueOf(occupiedNights), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        BigDecimal revenuePerAvailableNight = availableNights > 0
                ? totalRevenue.divide(BigDecimal.valueOf(availableNights), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        double cancellationRate = startingReservationCount > 0
                ? (cancelledReservations * 100.0) / startingReservationCount
                : 0.0;

        double averageLengthOfStay = reservationsStartingInPeriod.stream()
                .filter(this::isStayReservation)
                .mapToInt(this::calculateReservationNights)
                .average()
                .orElse(0.0);

        AnalyticsReportResponse.SummaryMetrics summary = AnalyticsReportResponse.SummaryMetrics.builder()
                .totalRevenue(totalRevenue)
                .occupancyPercentage(roundToTwoDecimals(occupancyPercentage))
                .averageDailyRate(averageDailyRate)
                .revenuePerAvailableNight(revenuePerAvailableNight)
                .occupiedNights(occupiedNights)
                .availableNights(availableNights)
                .reservationsOverlappingPeriod(slices.size())
                .reservationsStartingInPeriod(startingReservationCount)
                .cancelledReservations(cancelledReservations)
                .cancellationRate(roundToTwoDecimals(cancellationRate))
                .averageLengthOfStay(roundToTwoDecimals(averageLengthOfStay))
                .build();

        if (!includeDetailedData) {
            return new PeriodComputation(summary, List.of(), List.of(), List.of(), List.of());
        }

        List<AnalyticsReportResponse.DailyTrendPoint> dailyTrend = buildDailyTrend(from, to, activeSuiteCount, stayReservations);
        List<AnalyticsReportResponse.ChannelPerformance> channelPerformance = buildChannelPerformance(slices, totalRevenue);
        List<AnalyticsReportResponse.StatusBreakdown> statusBreakdown = buildStatusBreakdown(reservationsStartingInPeriod);
        List<AnalyticsReportResponse.DayHighlight> topRevenueDays = buildTopRevenueDays(dailyTrend, totalRevenue, daysInPeriod);

        return new PeriodComputation(summary, dailyTrend, channelPerformance, statusBreakdown, topRevenueDays);
    }

    private List<AnalyticsReportResponse.DailyTrendPoint> buildDailyTrend(
            LocalDate from,
            LocalDate to,
            int activeSuiteCount,
            List<Reservation> stayReservations) {
        List<AnalyticsReportResponse.DailyTrendPoint> points = new ArrayList<>();
        LocalDate day = from;

        while (!day.isAfter(to)) {
            int occupiedNights = 0;
            BigDecimal revenue = BigDecimal.ZERO;
            int arrivals = 0;
            int departures = 0;

            for (Reservation reservation : stayReservations) {
                if (occupiesDate(reservation, day)) {
                    occupiedNights++;

                    int reservationNights = calculateReservationNights(reservation);
                    BigDecimal priceTotal = reservation.getPriceTotal();
                    if (reservationNights > 0 && priceTotal != null) {
                        revenue = revenue.add(
                                priceTotal.divide(BigDecimal.valueOf(reservationNights), 4, RoundingMode.HALF_UP)
                        );
                    }
                }

                if (reservation.getCheckIn() != null && reservation.getCheckIn().isEqual(day)) {
                    arrivals++;
                }

                if (reservation.getCheckOut() != null && reservation.getCheckOut().isEqual(day)) {
                    departures++;
                }
            }

            double occupancyPercentage = activeSuiteCount > 0
                    ? (occupiedNights * 100.0) / activeSuiteCount
                    : 0.0;
            BigDecimal averageDailyRate = occupiedNights > 0
                    ? revenue.divide(BigDecimal.valueOf(occupiedNights), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            BigDecimal revPar = activeSuiteCount > 0
                    ? revenue.divide(BigDecimal.valueOf(activeSuiteCount), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            points.add(AnalyticsReportResponse.DailyTrendPoint.builder()
                    .date(day)
                    .occupiedNights(occupiedNights)
                    .availableNights(activeSuiteCount)
                    .occupancyPercentage(roundToTwoDecimals(occupancyPercentage))
                    .revenue(revenue.setScale(2, RoundingMode.HALF_UP))
                    .averageDailyRate(averageDailyRate)
                    .revenuePerAvailableNight(revPar)
                    .arrivals(arrivals)
                    .departures(departures)
                    .build());

            day = day.plusDays(1);
        }

        return points;
    }

    private List<AnalyticsReportResponse.ChannelPerformance> buildChannelPerformance(
            List<ReservationSlice> slices,
            BigDecimal totalRevenue) {
        Map<String, ChannelAggregate> aggregatedByChannel = new LinkedHashMap<>();

        for (ReservationSlice slice : slices) {
            String channel = normalizeChannel(slice.reservation.getChannel());
            ChannelAggregate aggregate = aggregatedByChannel.computeIfAbsent(channel, key -> new ChannelAggregate());
            aggregate.revenue = aggregate.revenue.add(slice.revenueInPeriod);
            aggregate.reservations += 1;
            aggregate.occupiedNights += slice.nightsInPeriod;
        }

        return aggregatedByChannel.entrySet().stream()
                .map(entry -> {
                    ChannelAggregate aggregate = entry.getValue();
                    BigDecimal revenue = aggregate.revenue.setScale(2, RoundingMode.HALF_UP);
                    double share = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                            ? revenue.multiply(BigDecimal.valueOf(100))
                                    .divide(totalRevenue, 4, RoundingMode.HALF_UP)
                                    .doubleValue()
                            : 0.0;
                    BigDecimal averageBookingValue = aggregate.reservations > 0
                            ? revenue.divide(BigDecimal.valueOf(aggregate.reservations), 2, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO;

                    return AnalyticsReportResponse.ChannelPerformance.builder()
                            .channel(entry.getKey())
                            .revenue(revenue)
                            .reservations(aggregate.reservations)
                            .occupiedNights(aggregate.occupiedNights)
                            .revenueSharePercentage(roundToTwoDecimals(share))
                            .averageBookingValue(averageBookingValue)
                            .build();
                })
                .sorted(Comparator.comparing(AnalyticsReportResponse.ChannelPerformance::getRevenue).reversed())
                .collect(Collectors.toList());
    }

    private List<AnalyticsReportResponse.StatusBreakdown> buildStatusBreakdown(List<Reservation> reservations) {
        int totalReservations = reservations.size();
        if (totalReservations == 0) {
            return List.of();
        }

        return reservations.stream()
                .collect(Collectors.groupingBy(
                        reservation -> reservation.getStatus() == null
                                ? "unknown"
                                : reservation.getStatus().getValue(),
                        LinkedHashMap::new,
                        Collectors.counting()))
                .entrySet().stream()
                .map(entry -> {
                    int count = entry.getValue().intValue();
                    double share = (count * 100.0) / totalReservations;
                    return AnalyticsReportResponse.StatusBreakdown.builder()
                            .status(entry.getKey())
                            .count(count)
                            .sharePercentage(roundToTwoDecimals(share))
                            .build();
                })
                .sorted(Comparator.comparing(AnalyticsReportResponse.StatusBreakdown::getCount).reversed())
                .collect(Collectors.toList());
    }

    private List<AnalyticsReportResponse.DayHighlight> buildTopRevenueDays(
            List<AnalyticsReportResponse.DailyTrendPoint> dailyTrend,
            BigDecimal totalRevenue,
            int daysInPeriod) {
        if (dailyTrend.isEmpty()) {
            return List.of();
        }

        BigDecimal averageDailyRevenue = daysInPeriod > 0
                ? totalRevenue.divide(BigDecimal.valueOf(daysInPeriod), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return dailyTrend.stream()
                .sorted(Comparator
                        .comparing(AnalyticsReportResponse.DailyTrendPoint::getRevenue).reversed()
                .thenComparing(AnalyticsReportResponse.DailyTrendPoint::getOccupancyPercentage, Comparator.reverseOrder()))
                .limit(TOP_REVENUE_DAY_COUNT)
                .map(point -> AnalyticsReportResponse.DayHighlight.builder()
                        .date(point.getDate())
                        .revenue(point.getRevenue())
                        .occupancyPercentage(point.getOccupancyPercentage())
                        .note(describeTopDay(point, averageDailyRevenue))
                        .build())
                .collect(Collectors.toList());
    }

    private AnalyticsReportResponse.DeltaMetrics buildDeltas(
            AnalyticsReportResponse.SummaryMetrics current,
            AnalyticsReportResponse.SummaryMetrics previous) {
        return AnalyticsReportResponse.DeltaMetrics.builder()
                .revenueChangePercentage(calculatePercentageChange(previous.getTotalRevenue(), current.getTotalRevenue()))
                .occupancyChangePercentagePoints(
                        roundToTwoDecimals(current.getOccupancyPercentage() - previous.getOccupancyPercentage()))
                .averageDailyRateChangePercentage(
                        calculatePercentageChange(previous.getAverageDailyRate(), current.getAverageDailyRate()))
                .revParChangePercentage(
                        calculatePercentageChange(previous.getRevenuePerAvailableNight(), current.getRevenuePerAvailableNight()))
                .cancellationRateChangePercentagePoints(
                        roundToTwoDecimals(current.getCancellationRate() - previous.getCancellationRate()))
                .build();
    }

    private List<String> buildInsights(
            PeriodComputation current,
            AnalyticsReportResponse.DeltaMetrics deltas,
            boolean includeComparison) {
        List<String> insights = new ArrayList<>();

        if (includeComparison && deltas != null) {
            double revenueDelta = safeDouble(deltas.getRevenueChangePercentage());
            if (revenueDelta >= 0) {
                insights.add("Revenue increased by " + formatOneDecimal(revenueDelta)
                        + "% versus the selected comparison baseline.");
            } else {
                insights.add("Revenue declined by " + formatOneDecimal(Math.abs(revenueDelta))
                        + "% versus the selected comparison baseline.");
            }
        } else {
            insights.add("Comparison is disabled; metrics reflect the selected period only.");
        }

        double occupancy = safeDouble(current.summary.getOccupancyPercentage());
        if (occupancy >= 80) {
            insights.add("Occupancy is running at a high " + formatOneDecimal(occupancy)
                    + "%, indicating strong demand.");
        } else if (occupancy < 55) {
            insights.add("Occupancy is " + formatOneDecimal(occupancy)
                    + "%; consider tactical pricing or channel pushes to lift fill rate.");
        }

        double cancellationRate = safeDouble(current.summary.getCancellationRate());
        if (cancellationRate >= 10) {
            insights.add("Cancellation rate is " + formatOneDecimal(cancellationRate)
                    + "%, which may justify stricter deposit or reminder policies.");
        }

        if (!current.channelPerformance.isEmpty()) {
            AnalyticsReportResponse.ChannelPerformance topChannel = current.channelPerformance.get(0);
            if (safeDouble(topChannel.getRevenueSharePercentage()) >= 45) {
                insights.add("" + normalizeChannelLabel(topChannel.getChannel()) + " drives "
                        + formatOneDecimal(topChannel.getRevenueSharePercentage())
                        + "% of revenue; monitor channel concentration risk.");
            }
        }

        if (!current.topRevenueDays.isEmpty()) {
            AnalyticsReportResponse.DayHighlight topDay = current.topRevenueDays.get(0);
            insights.add("Top revenue day was " + topDay.getDate() + " with €"
                    + topDay.getRevenue().setScale(0, RoundingMode.HALF_UP).toPlainString()
                    + " and occupancy at " + formatOneDecimal(topDay.getOccupancyPercentage()) + "%.");
        }

        if (insights.isEmpty()) {
            insights.add("Performance is stable across revenue, occupancy, and operational quality metrics.");
        }

        return insights;
    }

    private ReservationSlice buildSlice(Reservation reservation, LocalDate periodStart, LocalDate periodEnd) {
        int nightsInPeriod = calculateNightsInPeriod(reservation, periodStart, periodEnd);
        int reservationNights = calculateReservationNights(reservation);
        BigDecimal revenueInPeriod = calculateRevenueInPeriod(reservation, reservationNights, nightsInPeriod);
        return new ReservationSlice(reservation, nightsInPeriod, reservationNights, revenueInPeriod);
    }

    private boolean occupiesDate(Reservation reservation, LocalDate day) {
        if (reservation == null || reservation.getCheckIn() == null || reservation.getCheckOut() == null) {
            return false;
        }

        return !day.isBefore(reservation.getCheckIn()) && day.isBefore(reservation.getCheckOut());
    }

    private int getActiveSuiteCount() {
        return (int) suiteRepository.findAll().stream()
                .filter(suite -> Boolean.TRUE.equals(suite.getActive()))
                .count();
    }

    private List<Reservation> findOverlappingReservations(LocalDate from, LocalDate to, String nationalityCode) {
        if (nationalityCode == null) {
            return reservationRepository.findByCheckInBeforeAndCheckOutAfter(to.plusDays(1), from);
        }

        return reservationRepository.findByCheckInBeforeAndCheckOutAfterAndGuestNationalityNationalityCodeIgnoreCase(
                to.plusDays(1),
                from,
                nationalityCode
        );
    }

    private List<Reservation> findReservationsStartingInPeriod(LocalDate from, LocalDate to, String nationalityCode) {
        if (nationalityCode == null) {
            return reservationRepository.findByCheckInBetween(from, to);
        }

        return reservationRepository.findByCheckInBetweenAndGuestNationalityNationalityCodeIgnoreCase(
                from,
                to,
                nationalityCode
        );
    }

    private String normalizeComparisonMode(String comparisonMode) {
        if (comparisonMode == null || comparisonMode.isBlank()) {
            return COMPARISON_MODE_SAME_DATES_LAST_YEAR;
        }

        String normalized = comparisonMode.trim().toUpperCase(Locale.ROOT);
        if (COMPARISON_MODE_SAME_DATES_LAST_YEAR.equals(normalized)
                || COMPARISON_MODE_PREVIOUS_EQUAL_DAYS.equals(normalized)
                || COMPARISON_MODE_CUSTOM_RANGE.equals(normalized)) {
            return normalized;
        }

        throw new IllegalArgumentException("Invalid comparisonMode: " + comparisonMode);
    }

    private String normalizeNationalityCode(String nationalityCode) {
        if (nationalityCode == null || nationalityCode.isBlank()) {
            return null;
        }

        return nationalityCode.trim().toUpperCase(Locale.ROOT);
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("From and to dates are required");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("From date must be before or equal to to date");
        }

        int days = inclusiveDays(from, to);
        if (days > MAX_DAYS_IN_REPORT) {
            throw new IllegalArgumentException("Date range is too large. Please use up to " + MAX_DAYS_IN_REPORT + " days.");
        }
    }

    private int inclusiveDays(LocalDate from, LocalDate to) {
        return (int) ChronoUnit.DAYS.between(from, to) + 1;
    }

    private int countByStatus(List<Reservation> reservations, ReservationStatus status) {
        return (int) reservations.stream()
                .filter(reservation -> reservation.getStatus() == status)
                .count();
    }

    private boolean isStayReservation(Reservation reservation) {
        return reservation != null
                && reservation.getStatus() != null
                && STAY_STATUSES.contains(reservation.getStatus());
    }

    private int calculateReservationNights(Reservation reservation) {
        if (reservation == null || reservation.getCheckIn() == null || reservation.getCheckOut() == null) {
            return 0;
        }

        return Math.max(0, (int) ChronoUnit.DAYS.between(reservation.getCheckIn(), reservation.getCheckOut()));
    }

    private int calculateNightsInPeriod(Reservation reservation, LocalDate periodStart, LocalDate periodEnd) {
        if (reservation == null || reservation.getCheckIn() == null || reservation.getCheckOut() == null) {
            return 0;
        }

        LocalDate effectiveStart = reservation.getCheckIn().isBefore(periodStart)
                ? periodStart
                : reservation.getCheckIn();
        LocalDate effectiveEndExclusive = reservation.getCheckOut().isAfter(periodEnd.plusDays(1))
                ? periodEnd.plusDays(1)
                : reservation.getCheckOut();

        if (!effectiveStart.isBefore(effectiveEndExclusive)) {
            return 0;
        }

        return (int) ChronoUnit.DAYS.between(effectiveStart, effectiveEndExclusive);
    }

    private BigDecimal calculateRevenueInPeriod(Reservation reservation, int reservationNights, int nightsInPeriod) {
        if (reservation == null || reservation.getPriceTotal() == null) {
            return BigDecimal.ZERO;
        }
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

    private Double calculatePercentageChange(BigDecimal oldValue, BigDecimal newValue) {
        BigDecimal safeOld = oldValue == null ? BigDecimal.ZERO : oldValue;
        BigDecimal safeNew = newValue == null ? BigDecimal.ZERO : newValue;

        if (safeOld.compareTo(BigDecimal.ZERO) == 0) {
            return safeNew.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }

        BigDecimal change = safeNew.subtract(safeOld);
        BigDecimal percentageChange = change
                .divide(safeOld, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        return roundToTwoDecimals(percentageChange.doubleValue());
    }

    private String normalizeChannel(String channel) {
        if (channel == null || channel.isBlank()) {
            return "other";
        }
        return channel.trim().toLowerCase();
    }

    private String normalizeChannelLabel(String channel) {
        if (channel == null || channel.isBlank()) {
            return "Other";
        }
        if ("booking.com".equalsIgnoreCase(channel)) {
            return "Booking.com";
        }
        return Character.toUpperCase(channel.charAt(0)) + channel.substring(1).toLowerCase();
    }

    private String describeTopDay(AnalyticsReportResponse.DailyTrendPoint point, BigDecimal averageDailyRevenue) {
        if (safeDouble(point.getOccupancyPercentage()) >= 90) {
            return "Peak occupancy day";
        }

        BigDecimal threshold = averageDailyRevenue.multiply(BigDecimal.valueOf(1.25));
        if (point.getRevenue() != null && point.getRevenue().compareTo(threshold) >= 0) {
            return "Revenue spike day";
        }

        if (safeDouble(point.getOccupancyPercentage()) >= 75) {
            return "Strong occupancy day";
        }

        return "Solid performance day";
    }

    private String formatOneDecimal(Double value) {
        return String.format("%.1f", safeDouble(value));
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private static class PeriodComputation {
        final AnalyticsReportResponse.SummaryMetrics summary;
        final List<AnalyticsReportResponse.DailyTrendPoint> dailyTrend;
        final List<AnalyticsReportResponse.ChannelPerformance> channelPerformance;
        final List<AnalyticsReportResponse.StatusBreakdown> statusBreakdown;
        final List<AnalyticsReportResponse.DayHighlight> topRevenueDays;

        PeriodComputation(
                AnalyticsReportResponse.SummaryMetrics summary,
                List<AnalyticsReportResponse.DailyTrendPoint> dailyTrend,
                List<AnalyticsReportResponse.ChannelPerformance> channelPerformance,
                List<AnalyticsReportResponse.StatusBreakdown> statusBreakdown,
                List<AnalyticsReportResponse.DayHighlight> topRevenueDays) {
            this.summary = summary;
            this.dailyTrend = dailyTrend;
            this.channelPerformance = channelPerformance;
            this.statusBreakdown = statusBreakdown;
            this.topRevenueDays = topRevenueDays;
        }
    }

    private static class ReservationSlice {
        final Reservation reservation;
        final int nightsInPeriod;
        final int reservationNights;
        final BigDecimal revenueInPeriod;

        ReservationSlice(Reservation reservation, int nightsInPeriod, int reservationNights, BigDecimal revenueInPeriod) {
            this.reservation = reservation;
            this.nightsInPeriod = nightsInPeriod;
            this.reservationNights = reservationNights;
            this.revenueInPeriod = revenueInPeriod;
        }
    }

    private static class ChannelAggregate {
        BigDecimal revenue = BigDecimal.ZERO;
        int reservations = 0;
        int occupiedNights = 0;
    }

    private static class ComparisonPeriod {
        final LocalDate fromDate;
        final LocalDate toDate;
        final String mode;

        ComparisonPeriod(LocalDate fromDate, LocalDate toDate, String mode) {
            this.fromDate = fromDate;
            this.toDate = toDate;
            this.mode = mode;
        }
    }
}

package com.timorun.hmms.services;

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
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {
    private final ReservationRepository reservationRepository;
    private final SuiteRepository suiteRepository;

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
        
        // Get current month stats
        MonthlyStats currentStats = calculateMonthStats(startDate, endDate);
        
        // Get previous month stats
        YearMonth previousMonth = month.minusMonths(1);
        LocalDate prevStartDate = previousMonth.atDay(1);
        LocalDate prevEndDate = previousMonth.atEndOfMonth();
        MonthlyStats previousStats = calculateMonthStats(prevStartDate, prevEndDate);
        
        // Calculate changes
        Double revenueChange = calculatePercentageChange(
                previousStats.totalRevenue, 
                currentStats.totalRevenue
        );
        Double avgPriceChange = calculatePercentageChange(
                previousStats.averagePricePerNight, 
                currentStats.averagePricePerNight
        );
        Double occupancyChange = currentStats.occupancyPercentage - previousStats.occupancyPercentage;
        
        return MonthlyAnalyticsResponse.builder()
                .month(month)
                .totalRevenue(currentStats.totalRevenue)
                .occupancyPercentage(currentStats.occupancyPercentage)
                .averagePricePerNight(currentStats.averagePricePerNight)
                .totalReservations(currentStats.totalReservations)
                .totalNights(currentStats.totalNights)
                .previousMonthRevenue(previousStats.totalRevenue)
                .previousMonthOccupancy(previousStats.occupancyPercentage)
                .previousMonthAvgPrice(previousStats.averagePricePerNight)
                .revenueChange(revenueChange)
                .occupancyChange(occupancyChange)
                .avgPriceChange(avgPriceChange)
                .build();
    }

    // ===== PRIVATE HELPER METHODS =====

    private MonthlyStats calculateMonthStats(LocalDate startDate, LocalDate endDate) {
        // Get all reservations that overlap with this month
        List<Reservation> reservations = reservationRepository
                .findByCheckInBeforeAndCheckOutAfter(endDate.plusDays(1), startDate)
                .stream()
                .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED || r.getStatus() == ReservationStatus.CHECKED_IN || r.getStatus() == ReservationStatus.CHECKED_OUT)
                .collect(Collectors.toList());
        
        // Calculate total revenue
        BigDecimal totalRevenue = reservations.stream()
                .map(Reservation::getPriceTotal)
                .filter(price -> price != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Calculate total nights occupied in this month
        int totalNightsOccupied = reservations.stream()
                .mapToInt(r -> calculateNightsInPeriod(r, startDate, endDate))
                .sum();
        
        // Calculate total available nights (number of active suites * days in month)
        long daysInMonth = ChronoUnit.DAYS.between(startDate, endDate.plusDays(1));
        long activeSuiteCount = suiteRepository.findAll().stream()
                .filter(suite -> suite.getActive() != null && suite.getActive())
                .count();
        int totalAvailableNights = (int) (activeSuiteCount * daysInMonth);
        
        // Calculate occupancy percentage
        double occupancyPercentage = totalAvailableNights > 0 
                ? (totalNightsOccupied * 100.0) / totalAvailableNights 
                : 0.0;
        occupancyPercentage = Math.round(occupancyPercentage * 100.0) / 100.0; // Round to 2 decimals
        
        // Calculate average price per night
        BigDecimal averagePricePerNight = totalNightsOccupied > 0 
                ? totalRevenue.divide(BigDecimal.valueOf(totalNightsOccupied), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        
        MonthlyStats stats = new MonthlyStats();
        stats.totalRevenue = totalRevenue;
        stats.occupancyPercentage = occupancyPercentage;
        stats.averagePricePerNight = averagePricePerNight;
        stats.totalReservations = reservations.size();
        stats.totalNights = totalNightsOccupied;
        
        return stats;
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
        if (oldValue == null || oldValue.compareTo(BigDecimal.ZERO) == 0) {
            return newValue.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        }
        
        BigDecimal change = newValue.subtract(oldValue);
        BigDecimal percentageChange = change
                .divide(oldValue, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
        
        return percentageChange.doubleValue();
    }

    /**
     * Inner class to hold monthly statistics.
     */
    private static class MonthlyStats {
        BigDecimal totalRevenue = BigDecimal.ZERO;
        Double occupancyPercentage = 0.0;
        BigDecimal averagePricePerNight = BigDecimal.ZERO;
        Integer totalReservations = 0;
        Integer totalNights = 0;
    }
}

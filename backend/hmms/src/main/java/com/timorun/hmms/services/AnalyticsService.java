package com.timorun.hmms.services;

import com.timorun.hmms.dto.AnalyticsOutlook;
import com.timorun.hmms.dto.AnalyticsOverview;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.entities.SuiteRate;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRateRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import com.timorun.hmms.util.Channels;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

/**
 * Numbers for the Analytics page. Every sold stay is split into nights, each carrying an equal
 * share of the stay's price and of the platform commission; totals, channels, weekdays and months
 * are sums over those nights, so they always agree with each other.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {
    // Stays that count as sold: pending requests and unpaid ones are not revenue yet
    private static final Set<ReservationStatus> SOLD = EnumSet.of(
            ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT);
    private static final int MAX_DAYS = 731;
    private static final int OUTLOOK_GRID_DAYS = 14;

    private final ReservationRepository reservationRepository;
    private final SuiteRepository suiteRepository;
    private final SuiteRateRepository suiteRateRepository;
    private final CommissionRateService commissionRateService;

    public AnalyticsService(ReservationRepository reservationRepository, SuiteRepository suiteRepository,
                            SuiteRateRepository suiteRateRepository, CommissionRateService commissionRateService) {
        this.reservationRepository = reservationRepository;
        this.suiteRepository = suiteRepository;
        this.suiteRateRepository = suiteRateRepository;
        this.commissionRateService = commissionRateService;
    }

    /** A period (inclusive) compared with the same dates a year earlier. */
    public AnalyticsOverview overview(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new IllegalArgumentException("Choose a period whose end is on or after its start");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_DAYS) {
            throw new IllegalArgumentException("Choose a period of at most 2 years");
        }
        LocalDate compareFrom = from.minusYears(1);
        LocalDate compareTo = to.minusYears(1);
        int year = to.getYear();
        LocalDate loadFrom = min(compareFrom, LocalDate.of(year - 1, 1, 1));
        LocalDate loadTo = max(to, LocalDate.of(year, 12, 31));

        int suites = activeSuites().size();
        List<Night> nights = soldNights(loadFrom, loadTo);
        List<Night> current = between(nights, from, to);
        List<Night> previous = between(nights, compareFrom, compareTo);

        return new AnalyticsOverview(
                from, to, compareFrom, compareTo, suites,
                totals(current, suites * days(from, to)),
                totals(previous, suites * days(compareFrom, compareTo)),
                channels(current, previous),
                weekdays(current, previous, from, to, compareFrom, compareTo, suites),
                year,
                months(nights, year, suites));
    }

    /** Nights booked from today on, and the empty nights of the next two weeks with their price. */
    public AnalyticsOutlook outlook() {
        LocalDate today = LocalDate.now();
        List<Suite> suites = activeSuites();
        List<Reservation> reservations = reservationRepository.findByCheckInBeforeAndCheckOutAfter(today.plusDays(90), today)
                .stream()
                .filter(reservation -> reservation.getStatus() != ReservationStatus.CANCELLED
                        && reservation.getStatus() != ReservationStatus.NO_SHOW)
                .toList();

        List<LocalDate> days = today.datesUntil(today.plusDays(OUTLOOK_GRID_DAYS)).toList();
        Map<String, BigDecimal> prices = suiteRateRepository.findBySuiteIdInAndRateDateBetween(
                        suites.stream().map(Suite::getSuiteId).toList(), today, today.plusDays(OUTLOOK_GRID_DAYS - 1L))
                .stream()
                .collect(Collectors.toMap(rate -> rateKey(rate.getSuiteId(), rate.getRateDate()), SuiteRate::getPrice));

        List<AnalyticsOutlook.SuiteNights> grid = suites.stream()
                .map(suite -> new AnalyticsOutlook.SuiteNights(suite.getSuiteId(), suite.getSuiteName(), days.stream()
                        .map(day -> night(suite, day, reservations, prices))
                        .toList()))
                .toList();

        return new AnalyticsOutlook(today, window(reservations, today, 30, suites.size()),
                window(reservations, today, 90, suites.size()), days, grid);
    }

    // ===== Overview =====

    /** One sold night with its share of the stay's price and commission. */
    private record Night(LocalDate date, long reservationId, String channel, BigDecimal revenue, BigDecimal commission) {
        boolean direct() {
            return Channels.DIRECT.equals(channel);
        }
    }

    private List<Night> soldNights(LocalDate from, LocalDate to) {
        CommissionRateService.Rates rates = commissionRateService.rates();
        List<Night> nights = new ArrayList<>();
        for (Reservation reservation : reservationRepository.findByCheckInBeforeAndCheckOutAfter(to.plusDays(1), from)) {
            if (!SOLD.contains(reservation.getStatus())) {
                continue;
            }
            long stayNights = ChronoUnit.DAYS.between(reservation.getCheckIn(), reservation.getCheckOut());
            if (stayNights <= 0) {
                continue;
            }
            String channel = Channels.normalize(reservation.getChannel());
            BigDecimal price = reservation.getPriceTotal() != null ? reservation.getPriceTotal() : BigDecimal.ZERO;
            LocalDate bookedOn = reservation.getCreatedAt() != null ? reservation.getCreatedAt().toLocalDate() : reservation.getCheckIn();
            BigDecimal commission = rates.commissionOn(price, channel, bookedOn);
            BigDecimal nightRevenue = price.divide(BigDecimal.valueOf(stayNights), 6, RoundingMode.HALF_UP);
            BigDecimal nightCommission = commission.divide(BigDecimal.valueOf(stayNights), 6, RoundingMode.HALF_UP);

            LocalDate first = max(reservation.getCheckIn(), from);
            LocalDate end = min(reservation.getCheckOut(), to.plusDays(1));
            for (LocalDate day = first; day.isBefore(end); day = day.plusDays(1)) {
                nights.add(new Night(day, reservation.getReservationId(), channel, nightRevenue, nightCommission));
            }
        }
        return nights;
    }

    private static List<Night> between(List<Night> nights, LocalDate from, LocalDate to) {
        return nights.stream().filter(night -> !night.date().isBefore(from) && !night.date().isAfter(to)).toList();
    }

    private static AnalyticsOverview.Totals totals(List<Night> nights, int nightsAvailable) {
        BigDecimal revenue = sum(nights, Night::revenue);
        BigDecimal commission = sum(nights, Night::commission);
        List<Night> direct = nights.stream().filter(Night::direct).toList();
        List<Night> platform = nights.stream().filter(Predicate.not(Night::direct)).toList();
        return new AnalyticsOverview.Totals(
                money(revenue),
                money(commission),
                money(revenue.subtract(commission)),
                nights.size(),
                nightsAvailable,
                percent(nights.size(), nightsAvailable),
                nights.isEmpty() ? BigDecimal.ZERO : revenue.divide(BigDecimal.valueOf(nights.size()), 2, RoundingMode.HALF_UP),
                bookings(nights),
                direct.size(),
                money(sum(direct, Night::revenue)),
                platform.size(),
                money(sum(platform, Night::revenue)));
    }

    private static List<AnalyticsOverview.ChannelRow> channels(List<Night> current, List<Night> previous) {
        Map<String, List<Night>> currentByChannel = current.stream().collect(Collectors.groupingBy(Night::channel));
        Map<String, List<Night>> previousByChannel = previous.stream().collect(Collectors.groupingBy(Night::channel));
        Set<String> names = new LinkedHashSet<>(currentByChannel.keySet());
        names.addAll(previousByChannel.keySet());
        return names.stream()
                .map(channel -> {
                    List<Night> now = currentByChannel.getOrDefault(channel, List.of());
                    List<Night> before = previousByChannel.getOrDefault(channel, List.of());
                    return new AnalyticsOverview.ChannelRow(
                            channel,
                            !Channels.DIRECT.equals(channel),
                            bookings(now),
                            now.size(),
                            money(sum(now, Night::revenue)),
                            money(sum(now, Night::commission)),
                            before.size(),
                            money(sum(before, Night::revenue)));
                })
                .sorted(Comparator.comparingInt(AnalyticsOverview.ChannelRow::nights).reversed()
                        .thenComparing(AnalyticsOverview.ChannelRow::previousNights, Comparator.reverseOrder())
                        .thenComparing(AnalyticsOverview.ChannelRow::channel))
                .toList();
    }

    private static List<AnalyticsOverview.WeekdayRow> weekdays(List<Night> current, List<Night> previous,
                                                             LocalDate from, LocalDate to,
                                                             LocalDate compareFrom, LocalDate compareTo, int suites) {
        int[] sold = countByWeekday(current);
        int[] direct = countByWeekday(current.stream().filter(Night::direct).toList());
        int[] soldBefore = countByWeekday(previous);
        int[] days = daysByWeekday(from, to);
        int[] daysBefore = daysByWeekday(compareFrom, compareTo);
        List<AnalyticsOverview.WeekdayRow> rows = new ArrayList<>();
        for (int weekday = 1; weekday <= 7; weekday++) {
            rows.add(new AnalyticsOverview.WeekdayRow(weekday, sold[weekday], direct[weekday], days[weekday] * suites,
                    soldBefore[weekday], daysBefore[weekday] * suites));
        }
        return rows;
    }

    private static List<AnalyticsOverview.MonthRow> months(List<Night> nights, int year, int suites) {
        Map<YearMonth, List<Night>> byMonth = nights.stream().collect(Collectors.groupingBy(night -> YearMonth.from(night.date())));
        List<AnalyticsOverview.MonthRow> rows = new ArrayList<>();
        for (int month = 1; month <= 12; month++) {
            YearMonth current = YearMonth.of(year, month);
            YearMonth previous = current.minusYears(1);
            List<Night> now = byMonth.getOrDefault(current, List.of());
            List<Night> before = byMonth.getOrDefault(previous, List.of());
            rows.add(new AnalyticsOverview.MonthRow(
                    current.toString(),
                    now.size(),
                    current.lengthOfMonth() * suites,
                    money(sum(now, Night::revenue)),
                    (int) now.stream().filter(Night::direct).count(),
                    money(sum(now.stream().filter(Night::direct).toList(), Night::revenue)),
                    before.size(),
                    previous.lengthOfMonth() * suites,
                    money(sum(before, Night::revenue))));
        }
        return rows;
    }

    private static int[] countByWeekday(List<Night> nights) {
        int[] counts = new int[8];
        nights.forEach(night -> counts[night.date().getDayOfWeek().getValue()]++);
        return counts;
    }

    private static int[] daysByWeekday(LocalDate from, LocalDate to) {
        int[] counts = new int[8];
        from.datesUntil(to.plusDays(1)).forEach(day -> counts[day.getDayOfWeek().getValue()]++);
        return counts;
    }

    private static int bookings(List<Night> nights) {
        return (int) nights.stream().mapToLong(Night::reservationId).distinct().count();
    }

    // ===== Outlook =====

    private static AnalyticsOutlook.Window window(List<Reservation> reservations, LocalDate today, int days, int suites) {
        LocalDate end = today.plusDays(days);
        int booked = 0;
        int awaitingPayment = 0;
        BigDecimal revenue = BigDecimal.ZERO;
        for (Reservation reservation : reservations) {
            long stayNights = ChronoUnit.DAYS.between(reservation.getCheckIn(), reservation.getCheckOut());
            long inWindow = ChronoUnit.DAYS.between(max(reservation.getCheckIn(), today), min(reservation.getCheckOut(), end));
            if (stayNights <= 0 || inWindow <= 0) {
                continue;
            }
            if (SOLD.contains(reservation.getStatus())) {
                booked += (int) inWindow;
                if (reservation.getPriceTotal() != null) {
                    revenue = revenue.add(reservation.getPriceTotal().multiply(BigDecimal.valueOf(inWindow))
                            .divide(BigDecimal.valueOf(stayNights), 6, RoundingMode.HALF_UP));
                }
            } else if (reservation.getStatus() == ReservationStatus.AWAITING_PAYMENT) {
                awaitingPayment += (int) inWindow;
            }
        }
        return new AnalyticsOutlook.Window(days, days * suites, booked, awaitingPayment, money(revenue));
    }

    private static AnalyticsOutlook.Night night(Suite suite, LocalDate day, List<Reservation> reservations, Map<String, BigDecimal> prices) {
        Reservation stay = reservations.stream()
                .filter(reservation -> reservation.getSuite().getSuiteId().equals(suite.getSuiteId())
                        && !reservation.getCheckIn().isAfter(day) && reservation.getCheckOut().isAfter(day))
                // A sold stay wins over a request for the same night
                .min(Comparator.comparing((Reservation reservation) -> !SOLD.contains(reservation.getStatus())))
                .orElse(null);
        if (stay == null) {
            return new AnalyticsOutlook.Night(day, "empty", prices.get(rateKey(suite.getSuiteId(), day)));
        }
        String state = switch (stay.getStatus()) {
            case PENDING -> "pending";
            case AWAITING_PAYMENT -> "awaiting_payment";
            default -> Channels.isDirect(stay.getChannel()) ? "direct" : "platform";
        };
        return new AnalyticsOutlook.Night(day, state, null);
    }

    // ===== Helpers =====

    private List<Suite> activeSuites() {
        return suiteRepository.findAll().stream()
                .filter(suite -> Boolean.TRUE.equals(suite.getActive()))
                .sorted(Comparator.comparing(Suite::getSuiteName))
                .toList();
    }

    private static String rateKey(Long suiteId, LocalDate date) {
        return suiteId + "|" + date;
    }

    private static int days(LocalDate from, LocalDate to) {
        return (int) ChronoUnit.DAYS.between(from, to) + 1;
    }

    private static BigDecimal sum(List<Night> nights, Function<Night, BigDecimal> amount) {
        return nights.stream().map(amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private static double percent(int part, int whole) {
        return whole > 0 ? Math.round(part * 1000.0 / whole) / 10.0 : 0.0;
    }

    private static LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }

    private static LocalDate max(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }
}

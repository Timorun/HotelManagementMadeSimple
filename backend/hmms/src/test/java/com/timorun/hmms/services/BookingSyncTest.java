package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.BookingImportRequest;
import com.timorun.hmms.dto.BookingImportResult;
import com.timorun.hmms.dto.CreateReservationRequest;
import com.timorun.hmms.dto.IcalSyncResult;
import com.timorun.hmms.dto.ReservationResponse;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.entities.ReservationStatus;
import com.timorun.hmms.entities.Suite;
import com.timorun.hmms.ical.IcalCalendar;
import com.timorun.hmms.ical.IcalEvent;
import com.timorun.hmms.ical.IcalFetcher;
import com.timorun.hmms.repositories.ReservationRepository;
import com.timorun.hmms.repositories.SuiteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

class BookingSyncTest extends IntegrationTest {
    private static final long SUITE_ID = 3L;
    private static final LocalDate START = LocalDate.now().plusDays(30);

    @Autowired
    private BookingIcalSyncService syncService;

    @Autowired
    private BookingImportService importService;

    @Autowired
    private ReservationService reservationService;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private SuiteRepository suiteRepository;

    @MockitoBean
    private IcalFetcher fetcher;

    @BeforeEach
    void configureSuite() {
        Suite suite = suiteRepository.findById(SUITE_ID).orElseThrow();
        suite.setBookingIcalUrl("https://admin.booking.com/hotel/hoteladmin/ical.html?t=test");
        suiteRepository.save(suite);
    }

    private void feed(IcalEvent... events) throws Exception {
        when(fetcher.fetch(anyString())).thenReturn(IcalCalendar.write("test", List.of(events), Instant.now()));
    }

    private Reservation byUid(String uid) {
        return reservationRepository.findByExternalUid(uid).orElseThrow();
    }

    @Test
    void importsUpdatesAndCancelsStaysFromTheFeed() throws Exception {
        feed(new IcalEvent("one@booking", START, START.plusDays(3), "CLOSED - Not available"),
             new IcalEvent("two@booking", START.plusDays(10), START.plusDays(12), "CLOSED - Not available"));
        IcalSyncResult first = syncService.syncSuite(SUITE_ID);
        assertThat(first.created()).isEqualTo(2);
        assertThat(byUid("one@booking").getChannel()).isEqualTo("booking.com");
        assertThat(byUid("one@booking").getGuest().getFirstName()).isEqualTo("Booking.com");

        // Same feed again: nothing changes
        assertThat(syncService.syncSuite(SUITE_ID)).extracting(IcalSyncResult::created, IcalSyncResult::updated, IcalSyncResult::cancelled)
                .containsExactly(0, 0, 0);

        // "one" moved by a day, "two" removed (cancelled on booking.com)
        feed(new IcalEvent("one@booking", START.plusDays(1), START.plusDays(4), "CLOSED - Not available"));
        IcalSyncResult changed = syncService.syncSuite(SUITE_ID);
        assertThat(changed.updated()).isEqualTo(1);
        assertThat(changed.cancelled()).isEqualTo(1);
        assertThat(byUid("one@booking").getCheckIn()).isEqualTo(START.plusDays(1));
        assertThat(byUid("two@booking").getStatus()).isEqualTo(ReservationStatus.CANCELLED);
    }

    @Test
    void flagsDoubleBookingsAndExportsOnlyLocalStays() throws Exception {
        CreateReservationRequest local = new CreateReservationRequest();
        local.setSuiteId(SUITE_ID);
        local.setCheckIn(START.plusDays(40));
        local.setCheckOut(START.plusDays(43));
        local.setNumGuests(2);
        local.setPriceTotal(new BigDecimal("300"));
        local.setChannel("direct");
        local.setFirstName("Local");
        local.setLastName("Guest");
        local.setEmail("local.guest@example.com");
        ReservationResponse direct = reservationService.createReservation(local);

        feed(new IcalEvent("clash@booking", START.plusDays(41), START.plusDays(42), "CLOSED - Not available"));
        assertThat(syncService.syncSuite(SUITE_ID).conflicts()).isEqualTo(1);
        assertThat(byUid("clash@booking").isSyncConflict()).isTrue();

        String token = suiteRepository.findById(SUITE_ID).orElseThrow().getIcalExportToken();
        List<IcalEvent> exported = IcalCalendar.parse(syncService.exportFeed(token));
        assertThat(exported).extracting(IcalEvent::uid)
                .contains("hmms-" + direct.getReservationId() + "@hotelmanagementmadesimple")
                .doesNotContain("clash@booking");
        // The owner can see that booking.com reads the feed
        assertThat(suiteRepository.findById(SUITE_ID).orElseThrow().getIcalExportReadAt()).isNotNull();
    }

    @Test
    void feedErrorsAreRecordedOnTheSuite() throws Exception {
        when(fetcher.fetch(anyString())).thenThrow(new java.io.IOException("Calendar URL returned HTTP 404"));
        IcalSyncResult result = syncService.syncSuite(SUITE_ID);
        assertThat(result.error()).contains("404");
    }

    @Test
    void exportImportFillsPlaceholderGuestAndDryRunSavesNothing() throws Exception {
        feed(new IcalEvent("guest@booking", START.plusDays(60), START.plusDays(63), "CLOSED - Not available"));
        syncService.syncSuite(SUITE_ID);

        BookingImportRequest.Row row = new BookingImportRequest.Row();
        row.setBookingNumber("4455667788");
        row.setGuestName("Javier Moreno Castillo, Ana Moreno");
        row.setCheckIn(START.plusDays(60));
        row.setCheckOut(START.plusDays(63));
        row.setPeople(2);
        row.setPrice(new BigDecimal("390.50"));
        row.setStatus("ok");
        row.setCountry("es");
        row.setPhone("+34 611 22 33 44");
        row.setSuiteId(SUITE_ID);

        BookingImportRequest.Row fresh = new BookingImportRequest.Row();
        fresh.setBookingNumber("9999");
        fresh.setGuestName("Ingrid Larsen");
        fresh.setCheckIn(START.plusDays(80));
        fresh.setCheckOut(START.plusDays(82));
        fresh.setPeople(1);
        fresh.setStatus("ok");
        fresh.setSuiteId(SUITE_ID);

        BookingImportRequest request = new BookingImportRequest();
        request.setRows(List.of(row, fresh));

        request.setDryRun(false);
        importService.importRows(request);
        Reservation imported = byUid("guest@booking");
        assertThat(imported.getExternalRef()).isEqualTo("4455667788");
        assertThat(imported.getPriceTotal()).isEqualByComparingTo("390.50");
        assertThat(imported.getGuest().getFirstName()).isEqualTo("Javier");
        assertThat(imported.getGuest().getLastName()).isEqualTo("Moreno Castillo");
        assertThat(imported.getGuest().getPhone()).isEqualTo("+34611223344");
        assertThat(imported.getGuest().getNationality().getNationalityCode()).isEqualTo("ES");
        assertThat(reservationRepository.findFirstByExternalRef("9999")).isPresent();

        // Running the same file again only updates, by booking number
        BookingImportResult again = importService.importRows(request);
        assertThat(again.created()).isZero();
        assertThat(again.updated()).isEqualTo(2);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void dryRunReportsChangesWithoutSavingThem() {
        BookingImportRequest.Row row = new BookingImportRequest.Row();
        row.setBookingNumber("dry-run-1");
        row.setGuestName("Dry Run");
        row.setCheckIn(START.plusDays(300));
        row.setCheckOut(START.plusDays(302));
        row.setStatus("ok");
        row.setSuiteId(5L);
        BookingImportRequest request = new BookingImportRequest();
        request.setRows(List.of(row));
        request.setDryRun(true);

        BookingImportResult preview = importService.importRows(request);

        assertThat(preview.created()).isEqualTo(1);
        assertThat(reservationRepository.findFirstByExternalRef("dry-run-1")).isEmpty();
    }
}

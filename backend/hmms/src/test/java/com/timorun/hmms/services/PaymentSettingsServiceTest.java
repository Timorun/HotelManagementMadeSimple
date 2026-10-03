package com.timorun.hmms.services;

import com.timorun.hmms.IntegrationTest;
import com.timorun.hmms.dto.PaymentSettings;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PaymentSettingsServiceTest extends IntegrationTest {

    @Autowired
    private PaymentSettingsService service;

    @Test
    void savesNormalizedPaymentDetails() {
        assertThat(service.get().hasMethod()).isFalse();
        assertThat(service.get().deadlineDays()).isEqualTo(PaymentSettingsService.DEFAULT_DEADLINE_DAYS);

        PaymentSettings saved = service.update(new PaymentSettings("es91 2100 0418 4502 0005 1332", " Carmen Suites SL ", "612 345 678", 5));
        assertThat(saved.iban()).isEqualTo("ES9121000418450200051332");
        assertThat(saved.formattedIban()).isEqualTo("ES91 2100 0418 4502 0005 1332");
        assertThat(saved.accountHolder()).isEqualTo("Carmen Suites SL");
        assertThat(saved.bizumPhone()).isEqualTo("+34612345678");
        assertThat(saved.deadlineDays()).isEqualTo(5);
        assertThat(saved.hasMethod()).isTrue();

        // Clearing the bank account keeps Bizum
        PaymentSettings bizumOnly = service.update(new PaymentSettings("", "", "+34 612 345 678", null));
        assertThat(bizumOnly.iban()).isNull();
        assertThat(bizumOnly.accountHolder()).isNull();
        assertThat(bizumOnly.deadlineDays()).isEqualTo(PaymentSettingsService.DEFAULT_DEADLINE_DAYS);
    }

    @Test
    void rejectsTyposAndIncompleteDetails() {
        assertThatThrownBy(() -> service.update(new PaymentSettings("ES91 2100 0418 4502 0005 1333", "Carmen", null, 3)))
                .hasMessageContaining("check digits");
        assertThatThrownBy(() -> service.update(new PaymentSettings("1234", "Carmen", null, 3)))
                .hasMessageContaining("doesn't look right");
        assertThatThrownBy(() -> service.update(new PaymentSettings("ES9121000418450200051332", " ", null, 3)))
                .hasMessageContaining("account holder");
        assertThatThrownBy(() -> service.update(new PaymentSettings(null, null, "+31 6 12345678", 3)))
                .hasMessageContaining("Spanish");
        assertThatThrownBy(() -> service.update(new PaymentSettings(null, null, null, 0)))
                .hasMessageContaining("between 1 and 30");
    }
}

package com.timorun.hmms.util;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PhoneNumbersTest {

    @ParameterizedTest
    @CsvSource({
            "612 345 678, +34612345678",
            "+34 612-345-678, +34612345678",
            "0034612345678, +34612345678",
            "+31 6 12345678, +31612345678",
            "(+44) 7911 123456, +447911123456",
            "+1 201-555-0123, +12015550123",
    })
    void normalizesCommonFormatsToE164(String input, String expected) {
        assertThat(PhoneNumbers.toE164(input, "ES")).contains(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {"12", "abc", "+34 1", " "})
    void rejectsInvalidNumbers(String input) {
        assertThat(PhoneNumbers.toE164(input, "ES")).isEmpty();
    }
}

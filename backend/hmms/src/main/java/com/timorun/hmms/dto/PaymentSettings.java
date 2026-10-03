package com.timorun.hmms.dto;

/**
 * How guests pay for an accepted booking request, shown in the payment email.
 * Fields are null when not set.
 */
public record PaymentSettings(String iban, String accountHolder, String bizumPhone, Integer deadlineDays) {

    /** At least one way to pay is configured. */
    public boolean hasMethod() {
        return iban != null || bizumPhone != null;
    }

    /** "ES9121000418450200051332" -> "ES91 2100 0418 4502 0005 1332" */
    public String formattedIban() {
        return iban == null ? null : iban.replaceAll("(.{4})(?!$)", "$1 ");
    }
}

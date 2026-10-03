package com.timorun.hmms.services;

import com.timorun.hmms.dto.PaymentSettings;
import com.timorun.hmms.entities.AppSetting;
import com.timorun.hmms.repositories.AppSettingRepository;
import com.timorun.hmms.util.PhoneNumbers;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Payment details the owner sets on the Settings page: bank account, Bizum number and how many
 * days guests get to pay after a request is accepted.
 */
@Service
public class PaymentSettingsService {
    static final String IBAN = "payment.iban";
    static final String ACCOUNT_HOLDER = "payment.account_holder";
    static final String BIZUM_PHONE = "payment.bizum_phone";
    static final String DEADLINE_DAYS = "payment.deadline_days";
    public static final int DEFAULT_DEADLINE_DAYS = 3;
    private static final Pattern IBAN_FORMAT = Pattern.compile("[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}");

    private final AppSettingRepository settingRepository;

    public PaymentSettingsService(AppSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    public PaymentSettings get() {
        String days = value(DEADLINE_DAYS);
        return new PaymentSettings(value(IBAN), value(ACCOUNT_HOLDER), value(BIZUM_PHONE),
                days != null ? Integer.valueOf(days) : DEFAULT_DEADLINE_DAYS);
    }

    /** Pay-by date for a stay: today plus the days to pay, but never after the day of arrival. */
    public LocalDate defaultDueDate(LocalDate checkIn) {
        return defaultDueDate(checkIn, get().deadlineDays(), LocalDate.now());
    }

    static LocalDate defaultDueDate(LocalDate checkIn, int deadlineDays, LocalDate today) {
        LocalDate dueDate = today.plusDays(deadlineDays);
        if (dueDate.isAfter(checkIn)) {
            dueDate = checkIn.isBefore(today) ? today : checkIn;
        }
        return dueDate;
    }

    @Transactional
    public PaymentSettings update(PaymentSettings request) {
        String iban = normalizeIban(request.iban());
        String holder = blankToNull(request.accountHolder());
        if (iban != null && holder == null) {
            throw new IllegalArgumentException("Enter the account holder's name for the bank transfer");
        }
        if (holder != null && holder.length() > 100) {
            throw new IllegalArgumentException("The account holder's name can be at most 100 characters");
        }
        String bizum = normalizeBizum(request.bizumPhone());
        int days = request.deadlineDays() != null ? request.deadlineDays() : DEFAULT_DEADLINE_DAYS;
        if (days < 1 || days > 30) {
            throw new IllegalArgumentException("Guests get between 1 and 30 days to pay");
        }

        save(IBAN, iban);
        save(ACCOUNT_HOLDER, iban != null ? holder : null);
        save(BIZUM_PHONE, bizum);
        save(DEADLINE_DAYS, String.valueOf(days));
        return get();
    }

    /** Uppercase without spaces, and checked with the IBAN check digits (ISO 13616) to catch typos. */
    static String normalizeIban(String input) {
        String iban = blankToNull(input);
        if (iban == null) {
            return null;
        }
        iban = iban.replaceAll("[\\s-]", "").toUpperCase(Locale.ROOT);
        if (!IBAN_FORMAT.matcher(iban).matches()) {
            throw new IllegalArgumentException("That IBAN doesn't look right. It starts with the country code, e.g. ES91 2100 0418 4502 0005 1332");
        }
        String rearranged = iban.substring(4) + iban.substring(0, 4);
        StringBuilder digits = new StringBuilder();
        for (char c : rearranged.toCharArray()) {
            digits.append(Character.isDigit(c) ? String.valueOf(c) : String.valueOf(c - 'A' + 10));
        }
        if (!new BigInteger(digits.toString()).mod(BigInteger.valueOf(97)).equals(BigInteger.ONE)) {
            throw new IllegalArgumentException("That IBAN has a typo: its check digits don't match");
        }
        return iban;
    }

    private static String normalizeBizum(String input) {
        String phone = blankToNull(input);
        if (phone == null) {
            return null;
        }
        String e164 = PhoneNumbers.toE164(phone, "ES")
                .orElseThrow(() -> new IllegalArgumentException("That Bizum number is not a valid phone number"));
        if (!e164.startsWith("+34")) {
            throw new IllegalArgumentException("Bizum only works with Spanish phone numbers (+34)");
        }
        return e164;
    }

    private String value(String key) {
        return settingRepository.findById(key).map(AppSetting::getSettingValue).orElse(null);
    }

    private void save(String key, String value) {
        if (value == null) {
            settingRepository.deleteById(key);
        } else {
            settingRepository.save(new AppSetting(key, value));
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

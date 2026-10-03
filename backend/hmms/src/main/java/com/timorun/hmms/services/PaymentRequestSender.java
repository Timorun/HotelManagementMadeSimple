package com.timorun.hmms.services;

import com.timorun.hmms.dto.PaymentSettings;
import com.timorun.hmms.entities.Reservation;
import com.timorun.hmms.mail.GuestMails;
import com.timorun.hmms.mail.MailService;
import org.springframework.stereotype.Service;

/**
 * Emails a guest the price, the payment details and the pay-by date of a booking that waits for
 * payment: an accepted booking request, a reservation created as awaiting payment, or a reminder.
 */
@Service
public class PaymentRequestSender {
    private final PaymentSettingsService paymentSettingsService;
    private final MailService mailService;
    private final GuestMails guestMails;
    private final GuestPreferencesService preferencesService;

    public PaymentRequestSender(PaymentSettingsService paymentSettingsService, MailService mailService,
                                GuestMails guestMails, GuestPreferencesService preferencesService) {
        this.paymentSettingsService = paymentSettingsService;
        this.mailService = mailService;
        this.guestMails = guestMails;
        this.preferencesService = preferencesService;
    }

    /** The payment details to send; fails when there is no bank account or Bizum number to pay to. */
    public PaymentSettings requirePaymentDetails() {
        PaymentSettings payment = paymentSettingsService.get();
        if (!payment.hasMethod()) {
            throw new IllegalArgumentException("First add your bank account or Bizum number under Settings, Payments, so the guest knows how to pay");
        }
        return payment;
    }

    public void send(Reservation reservation, String message, PaymentSettings payment, boolean reminder) {
        mailService.send(guestMails.paymentRequested(reservation, message, payment, reminder,
                preferencesService.preferencesLink(reservation.getGuest().getGuestId())));
    }

    public void sendReminder(Reservation reservation, String message) {
        send(reservation, message, paymentSettingsService.get(), true);
    }
}

package com.timorun.hmms.mail;

import com.timorun.hmms.config.HotelSettings;
import com.timorun.hmms.dto.PaymentSettings;
import com.timorun.hmms.entities.Guest;
import com.timorun.hmms.entities.Reservation;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Texts of the emails sent to guests and to the owner, in Spanish or English.
 */
@Component
public class GuestMails {
    private static final DateTimeFormatter DATE_EN = DateTimeFormatter.ofPattern("EEE d MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter DATE_ES = DateTimeFormatter.ofPattern("EEE d MMM yyyy", Locale.forLanguageTag("es"));

    private final HotelSettings settings;

    public GuestMails(HotelSettings settings) {
        this.settings = settings;
    }

    private static boolean spanish(Guest guest) {
        return "es".equals(guest.getPreferredLanguage());
    }

    private String stay(Reservation r, boolean es) {
        DateTimeFormatter f = es ? DATE_ES : DATE_EN;
        return (es ? "Suite: " : "Suite: ") + r.getSuite().getSuiteName() + "\n"
                + (es ? "Llegada: " : "Check-in: ") + r.getCheckIn().format(f) + "\n"
                + (es ? "Salida: " : "Check-out: ") + r.getCheckOut().format(f) + "\n"
                + (es ? "Huéspedes: " : "Guests: ") + r.getNumGuests();
    }

    private String signature(boolean es) {
        return "\n\n" + (es ? "Un saludo,\n" : "Kind regards,\n") + settings.getHotelName();
    }

    private String preferencesFooter(String preferencesLink, boolean es) {
        if (preferencesLink == null) {
            return "";
        }
        return "\n\n--\n" + (es
                ? "Gestiona tus preferencias de comunicación o solicita la eliminación de tus datos: "
                : "Manage your communication preferences or request deletion of your data: ")
                + preferencesLink;
    }

    public MailMessage bookingRequestReceived(Reservation r, String preferencesLink) {
        Guest g = r.getGuest();
        boolean es = spanish(g);
        String subject = es
                ? "Hemos recibido tu solicitud de reserva - " + settings.getHotelName()
                : "We received your booking request - " + settings.getHotelName();
        String body = (es ? "Hola " : "Hello ") + g.getFirstName() + ",\n\n"
                + (es
                    ? "Gracias por tu solicitud. La revisaremos lo antes posible. Si la suite está disponible, te enviaremos los datos para el pago; tu reserva queda confirmada cuando recibamos el pago.\n\n"
                    : "Thank you for your request. We will review it as soon as possible. If the suite is available, we'll send you the payment details; your booking is confirmed once we receive the payment.\n\n")
                + stay(r, es)
                + "\n" + (es ? "Precio total: " : "Total price: ")
                + (r.getPriceTotal() != null ? formatPrice(r.getPriceTotal()) : (es ? "te lo confirmaremos por correo" : "we'll confirm it by email"))
                + (r.getNotes() != null && !r.getNotes().isBlank() ? "\n" + (es ? "Comentarios: " : "Comments: ") + r.getNotes() : "")
                + "\n\n" + (es ? "Referencia: #" : "Reference: #") + r.getReservationId()
                + signature(es)
                + preferencesFooter(preferencesLink, es);
        return new MailMessage(g.getEmail(), subject, body);
    }

    public MailMessage newBookingRequestForOwner(Reservation r) {
        Guest g = r.getGuest();
        String subject = "Nueva solicitud de reserva #" + r.getReservationId() + " - " + g.getFirstName() + " " + g.getLastName();
        String body = "Nueva solicitud desde la página de reservas.\n\n"
                + "Huésped: " + g.getFirstName() + " " + g.getLastName() + "\n"
                + "Email: " + g.getEmail() + "\n"
                + "Teléfono: " + (g.getPhone() != null ? g.getPhone() : "-") + "\n"
                + stay(r, true) + "\n"
                + "Precio: " + (r.getPriceTotal() != null
                    ? formatPrice(r.getPriceTotal()) + " (calendario de precios)"
                    : "sin precio (faltan noches en el calendario de precios)") + "\n"
                + (r.getNotes() != null && !r.getNotes().isBlank() ? "Comentarios: " + r.getNotes() + "\n" : "")
                + "\nAceptar o rechazar: " + settings.publicUrl("/requests");
        return new MailMessage(settings.getOwnerEmail(), subject, body);
    }

    /**
     * Sent when the owner accepts a request (and, as a reminder, when the deadline is extended):
     * the total, the deadline and how to pay.
     */
    public MailMessage paymentRequested(Reservation r, String message, PaymentSettings payment, boolean reminder,
                                        String preferencesLink) {
        Guest g = r.getGuest();
        boolean es = spanish(g);
        DateTimeFormatter f = es ? DATE_ES : DATE_EN;
        String total = formatPrice(r.getPriceTotal());
        String due = r.getPaymentDueDate().format(f);
        String subject = reminder
                ? (es ? "Recordatorio: pago de tu reserva - " : "Reminder: payment for your booking - ") + settings.getHotelName()
                : (es ? "Tu solicitud está aceptada: datos para el pago - " : "Your request is accepted: payment details - ") + settings.getHotelName();
        String intro = reminder
                ? (es ? "Te recordamos que aún no hemos recibido el pago de tu reserva. Por favor, paga " + total + " antes del " + due + "."
                      : "This is a reminder that we haven't received the payment for your booking yet. Please pay " + total + " by " + due + ".")
                : (es ? "¡Buenas noticias! " + r.getSuite().getSuiteName() + " está disponible para tus fechas. Para confirmar tu reserva, paga el total de " + total + " antes del " + due + "."
                      : "Good news: " + r.getSuite().getSuiteName() + " is available for your dates. To confirm your booking, please pay the total of " + total + " by " + due + ".");
        String body = (es ? "Hola " : "Hello ") + g.getFirstName() + ",\n\n"
                + intro + "\n\n"
                + stay(r, es)
                + "\n" + (es ? "Precio total: " : "Total price: ") + total
                + "\n" + (es ? "Referencia: #" : "Reference: #") + r.getReservationId()
                + "\n\n" + paymentInstructions(r, payment, es)
                + "\n\n" + (es
                    ? "Tu reserva queda confirmada cuando recibamos el pago; entonces te enviaremos la confirmación."
                    : "Your booking is confirmed once we receive the payment; we'll then send you the confirmation.")
                + (message != null && !message.isBlank() ? "\n\n" + message.trim() : "")
                + signature(es)
                + preferencesFooter(preferencesLink, es);
        return new MailMessage(g.getEmail(), subject, body);
    }

    private static String paymentInstructions(Reservation r, PaymentSettings payment, boolean es) {
        StringBuilder text = new StringBuilder(es ? "Cómo pagar:" : "How to pay:");
        String reference = "#" + r.getReservationId();
        if (payment.iban() != null) {
            text.append("\n- ").append(es ? "Transferencia bancaria a " : "Bank transfer to ").append(payment.formattedIban())
                    .append(" (").append(es ? "titular: " : "account holder: ").append(payment.accountHolder()).append("). ")
                    .append(es ? "Indica la referencia " + reference + " en el concepto." : "Please mention reference " + reference + " in the description.");
        }
        if (payment.bizumPhone() != null) {
            text.append("\n- Bizum ").append(es ? "al " : "to ").append(payment.bizumPhone()).append(", ")
                    .append(es ? "con la referencia " + reference + " como concepto." : "with reference " + reference + " as the concept.");
        }
        return text.toString();
    }

    /** Sent when the owner marks an accepted request as paid. */
    public MailMessage bookingConfirmed(Reservation r, String message, String preferencesLink) {
        Guest g = r.getGuest();
        boolean es = spanish(g);
        String subject = es
                ? "Reserva confirmada - " + settings.getHotelName()
                : "Booking confirmed - " + settings.getHotelName();
        String body = (es ? "Hola " : "Hello ") + g.getFirstName() + ",\n\n"
                + (r.getPaidAt() != null
                    ? (es ? "Hemos recibido tu pago. ¡Tu reserva está confirmada!\n\n" : "We have received your payment. Your booking is confirmed!\n\n")
                    : (es ? "¡Tu reserva está confirmada!\n\n" : "Your booking is confirmed!\n\n"))
                + stay(r, es)
                + (r.getPriceTotal() != null ? "\n" + (es ? "Precio total: " : "Total price: ") + formatPrice(r.getPriceTotal()) : "")
                + "\n" + (es ? "Referencia: #" : "Reference: #") + r.getReservationId()
                + (message != null && !message.isBlank() ? "\n\n" + message.trim() : "")
                + signature(es)
                + preferencesFooter(preferencesLink, es);
        return new MailMessage(g.getEmail(), subject, body);
    }

    public MailMessage bookingRejected(Reservation r, String reason, String preferencesLink) {
        Guest g = r.getGuest();
        boolean es = spanish(g);
        String subject = es
                ? "Sobre tu solicitud de reserva - " + settings.getHotelName()
                : "About your booking request - " + settings.getHotelName();
        String body = (es ? "Hola " : "Hello ") + g.getFirstName() + ",\n\n"
                + (es
                    ? "Lamentablemente no podemos confirmar tu solicitud para estas fechas.\n\n"
                    : "Unfortunately we can't confirm your request for these dates.\n\n")
                + stay(r, es)
                + (reason != null && !reason.isBlank() ? "\n\n" + reason.trim() : "")
                + "\n\n" + (es
                    ? "Si tienes fechas alternativas, estaremos encantados de ayudarte: " + settings.publicUrl("/book")
                    : "If you have other dates in mind, we'd be happy to help: " + settings.publicUrl("/book"))
                + signature(es)
                + preferencesFooter(preferencesLink, es);
        return new MailMessage(g.getEmail(), subject, body);
    }

    /** Sent when the owner cancels an accepted request that wasn't paid. */
    public MailMessage unpaidRequestCancelled(Reservation r, String reason, String preferencesLink) {
        Guest g = r.getGuest();
        boolean es = spanish(g);
        String subject = es
                ? "Tu solicitud de reserva ha sido cancelada - " + settings.getHotelName()
                : "Your booking request has been cancelled - " + settings.getHotelName();
        String body = (es ? "Hola " : "Hello ") + g.getFirstName() + ",\n\n"
                + (es
                    ? "No hemos recibido el pago de tu solicitud de reserva #" + r.getReservationId() + ", así que la hemos cancelado y las fechas vuelven a estar disponibles.\n\n"
                    : "We haven't received the payment for your booking request #" + r.getReservationId() + ", so we have cancelled it and released the dates.\n\n")
                + stay(r, es)
                + (reason != null && !reason.isBlank() ? "\n\n" + reason.trim() : "")
                + "\n\n" + (es
                    ? "Si aún quieres alojarte con nosotros, puedes hacer una nueva solicitud: " + settings.publicUrl("/book")
                    : "If you'd still like to stay with us, you're welcome to send a new request: " + settings.publicUrl("/book"))
                + signature(es)
                + preferencesFooter(preferencesLink, es);
        return new MailMessage(g.getEmail(), subject, body);
    }

    public MailMessage preferencesLink(Guest g, String link) {
        boolean es = spanish(g);
        String subject = es
                ? "Tus preferencias de comunicación - " + settings.getHotelName()
                : "Your communication preferences - " + settings.getHotelName();
        String body = (es ? "Hola " : "Hello ") + g.getFirstName() + ",\n\n"
                + (es
                    ? "Usa este enlace para dejar de recibir comunicaciones de marketing o para solicitar la eliminación de tus datos. El enlace es válido durante 7 días.\n\n"
                    : "Use this link to stop receiving marketing messages or to request deletion of your data. The link is valid for 7 days.\n\n")
                + link
                + "\n\n" + (es
                    ? "Si no has solicitado este correo, puedes ignorarlo."
                    : "If you didn't ask for this email, you can ignore it.")
                + signature(es);
        return new MailMessage(g.getEmail(), subject, body);
    }

    public MailMessage deletionRequestedForOwner(Guest g) {
        String subject = "Solicitud de eliminación de datos - " + g.getFirstName() + " " + g.getLastName();
        String body = "El huésped " + g.getFirstName() + " " + g.getLastName() + " (#" + g.getGuestId() + ", " + g.getEmail()
                + ") ha solicitado la eliminación de sus datos.\n\n"
                + "Revisa y anonimiza al huésped en: " + settings.publicUrl("/guests");
        return new MailMessage(settings.getOwnerEmail(), subject, body);
    }

    private static String formatPrice(BigDecimal price) {
        return "€" + price.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }
}

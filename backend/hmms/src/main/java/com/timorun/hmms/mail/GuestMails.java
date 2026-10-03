package com.timorun.hmms.mail;

import com.timorun.hmms.config.HotelSettings;
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
                    ? "Gracias por tu solicitud. La revisaremos y te confirmaremos la disponibilidad y el precio por correo lo antes posible.\n\n"
                    : "Thank you for your request. We will review it and confirm availability and the price by email as soon as possible.\n\n")
                + stay(r, es)
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
                + (r.getNotes() != null && !r.getNotes().isBlank() ? "Comentarios: " + r.getNotes() + "\n" : "")
                + "\nConfirmar o rechazar: " + settings.publicUrl("/requests");
        return new MailMessage(settings.getOwnerEmail(), subject, body);
    }

    public MailMessage bookingConfirmed(Reservation r, String message, String preferencesLink) {
        Guest g = r.getGuest();
        boolean es = spanish(g);
        String subject = es
                ? "Reserva confirmada - " + settings.getHotelName()
                : "Booking confirmed - " + settings.getHotelName();
        String body = (es ? "Hola " : "Hello ") + g.getFirstName() + ",\n\n"
                + (es ? "¡Tu reserva está confirmada!\n\n" : "Your booking is confirmed!\n\n")
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

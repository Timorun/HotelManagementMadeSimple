package com.timorun.hmms.mail;

import com.timorun.hmms.config.HotelSettings;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends transactional email over SMTP. With hmms.mail.enabled=false (the default for local
 * development) messages are only logged, so flows can be tested without a mail server.
 * Sending is asynchronous and never fails the calling request.
 */
@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final HotelSettings settings;

    public MailService(ObjectProvider<JavaMailSender> mailSender, HotelSettings settings) {
        this.mailSender = mailSender;
        this.settings = settings;
    }

    @Async
    public void send(MailMessage message) {
        if (message.to() == null || message.to().isBlank()) {
            log.warn("Skipping email '{}': no recipient", message.subject());
            return;
        }

        if (!settings.isMailEnabled()) {
            log.info("Mail disabled, would send to {}:\nSubject: {}\n{}", message.to(), message.subject(), message.body());
            return;
        }

        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.error("Mail enabled but no SMTP server configured (SPRING_MAIL_HOST); not sending '{}'", message.subject());
            return;
        }

        try {
            MimeMessage mime = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, "UTF-8");
            helper.setFrom(settings.getMailFrom(), settings.getHotelName());
            helper.setTo(message.to());
            helper.setSubject(message.subject());
            helper.setText(message.body(), false);
            sender.send(mime);
            log.info("Sent email '{}' to {}", message.subject(), message.to());
        } catch (Exception e) {
            log.error("Failed to send email '{}' to {}", message.subject(), message.to(), e);
        }
    }
}

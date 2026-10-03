package com.timorun.hmms.mail;

/**
 * A plain-text email ready to send.
 */
public record MailMessage(String to, String subject, String body) {
}

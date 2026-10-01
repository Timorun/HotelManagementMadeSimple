package com.timorun.hmms.ical;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Downloads iCal feeds over HTTP(S).
 */
@Component
public class IcalFetcher {
    private static final Duration TIMEOUT = Duration.ofSeconds(20);

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public String fetch(String url) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                .header("Accept", "text/calendar")
                .header("User-Agent", "HotelManagementMadeSimple calendar sync")
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() / 100 != 2) {
            throw new IOException("Calendar URL returned HTTP " + response.statusCode());
        }
        if (!response.body().contains("BEGIN:VCALENDAR")) {
            throw new IOException("The URL did not return an iCal calendar");
        }
        return response.body();
    }
}

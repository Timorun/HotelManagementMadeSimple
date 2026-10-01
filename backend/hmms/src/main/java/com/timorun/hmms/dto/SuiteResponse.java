package com.timorun.hmms.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for returning suite details.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SuiteResponse {
    private Long suiteId;
    private String suiteName;
    private Integer capacity;
    private Boolean active;
    private String bookingIcalUrl;
    // Absolute URL of this suite's iCal feed, to paste into booking.com
    private String icalExportUrl;
    private LocalDateTime icalLastSyncAt;
    private String icalLastSyncError;
}

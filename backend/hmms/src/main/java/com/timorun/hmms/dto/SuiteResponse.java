package com.timorun.hmms.dto;

import java.time.LocalDateTime;
import java.util.List;
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
    private String descriptionEn;
    private String descriptionEs;
    private Integer sizeM2;
    private List<String> amenities;
    private List<String> photoUrls;
}

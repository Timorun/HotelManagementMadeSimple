package com.timorun.hmms.dto;

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
}

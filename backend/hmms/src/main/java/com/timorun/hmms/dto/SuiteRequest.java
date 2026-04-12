package com.timorun.hmms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for creating or updating a suite.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SuiteRequest {
    private String suiteName;
    private Integer capacity;
    private Boolean active;
}

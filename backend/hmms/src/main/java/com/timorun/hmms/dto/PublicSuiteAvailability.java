package com.timorun.hmms.dto;

/**
 * A suite that can be requested for the searched dates.
 */
public record PublicSuiteAvailability(Long suiteId, String suiteName, Integer capacity) {
}

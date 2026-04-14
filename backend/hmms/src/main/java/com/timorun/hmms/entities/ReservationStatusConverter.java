package com.timorun.hmms.entities;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA converter for ReservationStatus enum.
 * Converts between the enum and its string value for database storage.
 * This ensures "confirmed" is stored, not "CONFIRMED".
 */
@Converter(autoApply = true)
public class ReservationStatusConverter implements AttributeConverter<ReservationStatus, String> {

    @Override
    public String convertToDatabaseColumn(ReservationStatus attribute) {
        if (attribute == null) {
            return ReservationStatus.PENDING.getValue();
        }
        return attribute.getValue();
    }

    @Override
    public ReservationStatus convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return ReservationStatus.PENDING;
        }
        return ReservationStatus.fromValue(dbData);
    }
}

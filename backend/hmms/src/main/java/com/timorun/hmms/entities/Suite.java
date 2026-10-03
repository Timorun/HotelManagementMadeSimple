package com.timorun.hmms.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "suites")
@Getter
@Setter
@NoArgsConstructor
public class Suite {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long suiteId;

    private String suiteName;
    private Integer capacity;
    
    @Column(columnDefinition = "BOOLEAN DEFAULT true")
    private Boolean active;

    // Booking.com "export calendar" URL for this suite; imported every few minutes
    private String bookingIcalUrl;
    // Secret token in our own iCal feed URL (given to booking.com to block dates booked here)
    private String icalExportToken;
    private LocalDateTime icalLastSyncAt;
    private String icalLastSyncError;
    // Last time our feed was downloaded (by booking.com, normally every couple of hours)
    private LocalDateTime icalExportReadAt;

    // Details shown on the public booking page
    private String descriptionEn;
    private String descriptionEs;
    private Integer sizeM2;
    // Comma-separated amenity keys, e.g. "double_bed,wifi,kitchen"; labels and icons live in the frontend
    private String amenities;

    // Photo URLs in display order: paths of images shipped with the frontend (/suites/...) or https:// links
    @ElementCollection
    @CollectionTable(name = "suite_photos", joinColumns = @JoinColumn(name = "suite_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "url", nullable = false)
    private List<String> photoUrls = new ArrayList<>();

    @PrePersist
    void ensureExportToken() {
        if (icalExportToken == null) {
            icalExportToken = UUID.randomUUID().toString().replace("-", "");
        }
    }
    
    @OneToMany(mappedBy = "suite")
    @JsonIgnore
    private List<Reservation> reservations;
}
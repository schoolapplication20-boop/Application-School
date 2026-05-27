package com.schoolers.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "meeting_bookings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingBooking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slot_id")
    private Long slotId;

    @Column(name = "student_id")
    private Long studentId;

    @Column(name = "student_name", length = 100)
    private String studentName;

    @Column(name = "parent_name", length = 100)
    private String parentName;

    @Column(name = "parent_email", length = 150)
    private String parentEmail;

    @Column(name = "school_id")
    private Long schoolId;

    @Enumerated(EnumType.STRING)
    @Column(length = 15)
    @Builder.Default
    private Status status = Status.CONFIRMED;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum Status { CONFIRMED, CANCELLED }
}

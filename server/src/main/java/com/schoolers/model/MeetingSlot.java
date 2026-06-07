package com.schoolers.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "meeting_slots")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "teacher_id")
    private Long teacherId;

    @Column(name = "teacher_name", length = 100)
    private String teacherName;

    @Column(name = "school_id")
    private Long schoolId;

    @NotNull
    @Column(name = "meeting_date", nullable = false)
    private LocalDate meetingDate;

    @NotNull
    @Column(name = "start_time", nullable = false, length = 10)
    private String startTime;

    @NotNull
    @Column(name = "end_time", nullable = false, length = 10)
    private String endTime;

    @Column(length = 200)
    private String topic;

    @Column(name = "max_bookings")
    @Builder.Default
    private Integer maxBookings = 1;

    @Column(name = "is_available")
    @Builder.Default
    private Boolean isAvailable = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

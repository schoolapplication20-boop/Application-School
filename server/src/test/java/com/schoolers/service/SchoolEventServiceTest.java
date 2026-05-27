package com.schoolers.service;

import com.schoolers.dto.ApiResponse;
import com.schoolers.model.SchoolEvent;
import com.schoolers.repository.SchoolEventRepository;
import com.schoolers.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SchoolEventService")
class SchoolEventServiceTest {

    @InjectMocks private SchoolEventService eventService;

    @Mock private SchoolEventRepository eventRepository;
    @Mock private UserRepository         userRepository;
    @Mock private Authentication         auth;

    private static final Long SCHOOL_ID = 5L;

    @BeforeEach
    void setUp() {
        lenient().when(auth.getName()).thenReturn("admin@school.com");
        lenient().when(userRepository.findByEmailIgnoreCase("admin@school.com"))
                 .thenReturn(Optional.empty()); // userId not critical in most tests
    }

    // ── createEvent ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("createEvent: valid request saves event")
    void createEvent_valid_savesEvent() {
        when(eventRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ApiResponse<SchoolEvent> resp = eventService.createEvent(Map.of(
            "title",     "Annual Sports Day",
            "startDate", "2026-08-15"
        ), auth, SCHOOL_ID);

        assertTrue(resp.isSuccess());
        verify(eventRepository).save(any(SchoolEvent.class));
    }

    @Test
    @DisplayName("createEvent: missing title returns error")
    void createEvent_missingTitle_returnsError() {
        ApiResponse<SchoolEvent> resp = eventService.createEvent(Map.of(
            "startDate", "2026-08-15"
        ), auth, SCHOOL_ID);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("title"));
        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvent: blank title returns error")
    void createEvent_blankTitle_returnsError() {
        ApiResponse<SchoolEvent> resp = eventService.createEvent(Map.of(
            "title",     "   ",
            "startDate", "2026-08-15"
        ), auth, SCHOOL_ID);

        assertFalse(resp.isSuccess());
        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvent: missing startDate returns error")
    void createEvent_missingStartDate_returnsError() {
        ApiResponse<SchoolEvent> resp = eventService.createEvent(Map.of(
            "title", "Sports Day"
        ), auth, SCHOOL_ID);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("start date") ||
                   resp.getMessage().toLowerCase().contains("startdate"));
        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvent: invalid startDate format returns error")
    void createEvent_invalidStartDate_returnsError() {
        ApiResponse<SchoolEvent> resp = eventService.createEvent(Map.of(
            "title",     "Sports Day",
            "startDate", "not-a-date"
        ), auth, SCHOOL_ID);

        assertFalse(resp.isSuccess());
        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("createEvent: defaults eventType to EVENT when not provided")
    void createEvent_noEventType_defaultsToEVENT() {
        when(eventRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ApiResponse<SchoolEvent> resp = eventService.createEvent(Map.of(
            "title",     "Graduation",
            "startDate", "2026-09-01"
        ), auth, SCHOOL_ID);

        assertTrue(resp.isSuccess());
        assertEquals("EVENT", resp.getData().getEventType());
    }

    @Test
    @DisplayName("createEvent: valid endDate is persisted")
    void createEvent_withEndDate_persists() {
        when(eventRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ApiResponse<SchoolEvent> resp = eventService.createEvent(Map.of(
            "title",     "School Week",
            "startDate", "2026-09-01",
            "endDate",   "2026-09-05"
        ), auth, SCHOOL_ID);

        assertTrue(resp.isSuccess());
        assertEquals(LocalDate.of(2026, 9, 5), resp.getData().getEndDate());
    }

    // ── updateEvent ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateEvent: event not found returns error")
    void updateEvent_notFound_returnsError() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        ApiResponse<SchoolEvent> resp = eventService.updateEvent(99L, Map.of("title", "New Title"), SCHOOL_ID);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("not found"));
    }

    @Test
    @DisplayName("updateEvent: wrong school returns unauthorized error")
    void updateEvent_wrongSchool_returnsError() {
        SchoolEvent event = SchoolEvent.builder()
                .title("Old Title").startDate(LocalDate.of(2026, 8, 1))
                .schoolId(99L).build(); // belongs to different school
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));

        ApiResponse<SchoolEvent> resp = eventService.updateEvent(1L, Map.of("title", "New Title"), SCHOOL_ID);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("unauthorized"));
        verify(eventRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateEvent: success updates title")
    void updateEvent_success_updatesTitle() {
        SchoolEvent event = SchoolEvent.builder()
                .title("Old Title").startDate(LocalDate.of(2026, 8, 1))
                .schoolId(SCHOOL_ID).build();
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        when(eventRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        ApiResponse<SchoolEvent> resp = eventService.updateEvent(1L, Map.of("title", "New Title"), SCHOOL_ID);

        assertTrue(resp.isSuccess());
        assertEquals("New Title", event.getTitle());
    }

    // ── deleteEvent ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("deleteEvent: event not found returns error")
    void deleteEvent_notFound_returnsError() {
        when(eventRepository.findById(99L)).thenReturn(Optional.empty());

        ApiResponse<String> resp = eventService.deleteEvent(99L, SCHOOL_ID);

        assertFalse(resp.isSuccess());
    }

    @Test
    @DisplayName("deleteEvent: wrong school returns unauthorized error")
    void deleteEvent_wrongSchool_returnsError() {
        SchoolEvent event = SchoolEvent.builder()
                .title("Sports Day").startDate(LocalDate.of(2026, 8, 1))
                .schoolId(99L).build();
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));

        ApiResponse<String> resp = eventService.deleteEvent(1L, SCHOOL_ID);

        assertFalse(resp.isSuccess());
        assertTrue(resp.getMessage().toLowerCase().contains("unauthorized"));
        verify(eventRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("deleteEvent: success deletes event")
    void deleteEvent_success() {
        SchoolEvent event = SchoolEvent.builder()
                .title("Sports Day").startDate(LocalDate.of(2026, 8, 1))
                .schoolId(SCHOOL_ID).build();
        when(eventRepository.findById(1L)).thenReturn(Optional.of(event));
        doNothing().when(eventRepository).deleteById(1L);

        ApiResponse<String> resp = eventService.deleteEvent(1L, SCHOOL_ID);

        assertTrue(resp.isSuccess());
        verify(eventRepository).deleteById(1L);
    }
}

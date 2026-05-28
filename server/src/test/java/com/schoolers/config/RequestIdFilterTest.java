package com.schoolers.config;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for RequestIdFilter.
 *
 * The filter is tested as a plain object — no Spring context needed.
 * Tests verify: UUID generation, incoming-ID passthrough, response header
 * propagation, MDC population during the request, and MDC cleanup after.
 */
class RequestIdFilterTest {

    private static final Pattern UUID_PATTERN =
            Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

    private RequestIdFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RequestIdFilter();
        MDC.clear(); // ensure clean MDC before each test
    }

    @Test
    @DisplayName("generates a UUID request-ID when no incoming X-Request-Id header")
    void generatesUuid_whenNoIncomingHeader() throws Exception {
        MockHttpServletRequest  req  = new MockHttpServletRequest();
        MockHttpServletResponse res  = new MockHttpServletResponse();

        filter.doFilter(req, res, new MockFilterChain());

        String id = res.getHeader("X-Request-Id");
        assertThat(id).isNotNull();
        assertThat(UUID_PATTERN.matcher(id).matches()).isTrue();
    }

    @Test
    @DisplayName("re-uses the X-Request-Id provided by the caller (API gateway passthrough)")
    void reusesIncomingRequestId() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("X-Request-Id", "gateway-assigned-id-123");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, new MockFilterChain());

        assertThat(res.getHeader("X-Request-Id")).isEqualTo("gateway-assigned-id-123");
    }

    @Test
    @DisplayName("blank X-Request-Id header is ignored: a new UUID is generated")
    void blankIncomingHeader_generatesNewUuid() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("X-Request-Id", "   ");
        MockHttpServletResponse res = new MockHttpServletResponse();

        filter.doFilter(req, res, new MockFilterChain());

        String id = res.getHeader("X-Request-Id");
        assertThat(UUID_PATTERN.matcher(id).matches()).isTrue();
    }

    @Test
    @DisplayName("MDC contains the requestId during filter chain execution")
    void mdcContainsRequestId_duringChainExecution() throws Exception {
        MockHttpServletRequest  req  = new MockHttpServletRequest();
        MockHttpServletResponse res  = new MockHttpServletResponse();
        AtomicReference<String> mdcDuringChain = new AtomicReference<>();

        FilterChain capturingChain = (servletReq, servletRes) ->
                mdcDuringChain.set(MDC.get("requestId"));

        filter.doFilter(req, res, capturingChain);

        assertThat(mdcDuringChain.get()).isNotNull();
        assertThat(mdcDuringChain.get()).isEqualTo(res.getHeader("X-Request-Id"));
    }

    @Test
    @DisplayName("MDC is cleared after the filter chain completes (no MDC leak)")
    void mdcIsCleared_afterFilterChainCompletes() throws Exception {
        filter.doFilter(new MockHttpServletRequest(),
                        new MockHttpServletResponse(),
                        new MockFilterChain());

        assertThat(MDC.get("requestId")).isNull();
    }

    @Test
    @DisplayName("MDC is cleared even when the filter chain throws an exception")
    void mdcIsCleared_evenWhenChainThrows() throws Exception {
        MockHttpServletRequest  req  = new MockHttpServletRequest();
        MockHttpServletResponse res  = new MockHttpServletResponse();

        FilterChain throwingChain = (q, s) -> { throw new RuntimeException("test error"); };

        try {
            filter.doFilter(req, res, throwingChain);
        } catch (RuntimeException ignored) {}

        assertThat(MDC.get("requestId")).isNull();
    }

    @Test
    @DisplayName("each request gets a unique requestId")
    void eachRequest_getsUniqueId() throws Exception {
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        MockHttpServletResponse res2 = new MockHttpServletResponse();

        filter.doFilter(new MockHttpServletRequest(), res1, new MockFilterChain());
        filter.doFilter(new MockHttpServletRequest(), res2, new MockFilterChain());

        assertThat(res1.getHeader("X-Request-Id"))
                .isNotEqualTo(res2.getHeader("X-Request-Id"));
    }
}

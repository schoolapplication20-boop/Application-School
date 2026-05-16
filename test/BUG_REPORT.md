# Bug Report — my-skoolz School Management System

**Generated:** 2026-05-15  
**Test Run Coverage:** 95 frontend tests (Vitest) · 42 backend tests (JUnit 5)  
**Status:** All 137 tests passing after fixes applied during this session

---

## Summary

| # | Severity | Area | Status |
|---|----------|------|--------|
| 1 | High | Backend — GlobalExceptionHandler | **Fixed** |
| 2 | High | Backend — SecurityConfig | Open |
| 3 | Medium | Frontend — Password toggle accessibility | Open |
| 4 | Medium | Frontend — PARENT role routing | Open |
| 5 | Medium | Frontend — Duplicate API functions | Open |
| 6 | Low | Frontend — Production URL in .env | Open |
| 7 | Low | Frontend — Missing PWA icons | Open |

---

## Bug #1 — Validation Errors Return HTTP 500 Instead of 400

**Severity:** High  
**Area:** Backend — `GlobalExceptionHandler.java`  
**Status:** Fixed in this session

### Description
When a request body fails `@Valid` bean-validation (e.g. blank password in login), Spring throws `MethodArgumentNotValidException`. The `GlobalExceptionHandler` had no handler for this exception type, so it fell through to the catch-all `Exception.class` handler which always returns HTTP 500 with a "Server error:" prefix.

### Reproduction
```
POST /api/auth/login
Content-Type: application/json
{"email":"a@b.com","selectedRole":"ADMIN"}   ← password missing
```
**Before fix:** `500 Internal Server Error` — `{"success":false,"message":"Server error: Validation failed..."}`  
**After fix:** `400 Bad Request` — `{"success":false,"message":"Password is required"}`

### Root Cause
`GlobalExceptionHandler` lacked a `@ExceptionHandler(MethodArgumentNotValidException.class)` method.

### Fix Applied
Added handler in [GlobalExceptionHandler.java](../server/src/main/java/com/schoolers/controller/GlobalExceptionHandler.java):
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(message));
}
```

---

## Bug #2 — Unauthenticated Requests Return 403 Instead of 401

**Severity:** High  
**Area:** Backend — `SecurityConfig.java`  
**Status:** Open

### Description
REST convention requires unauthenticated requests to return `401 Unauthorized`. The current JWT security configuration uses `SessionCreationPolicy.STATELESS` without configuring an `AuthenticationEntryPoint`. Spring Security defaults to `Http403ForbiddenEntryPoint`, which returns `403 Forbidden` for ALL requests that lack credentials — regardless of whether the user is unauthenticated or authenticated-but-unauthorized.

Clients that rely on 401 to trigger a login redirect will be confused.

### Reproduction
```
GET /api/admin/students
(no Authorization header)
```
**Actual:** `403 Forbidden`  
**Expected:** `401 Unauthorized`

### Fix Recommendation
Add an `AuthenticationEntryPoint` to `SecurityConfig.filterChain()`:
```java
.exceptionHandling(ex -> ex
    .authenticationEntryPoint((request, response, authException) ->
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required"))
    .accessDeniedHandler((request, response, accessDeniedException) ->
        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access denied"))
)
```

---

## Bug #3 — Password Visibility Toggle Is Not Keyboard Accessible

**Severity:** Medium  
**Area:** Frontend — `Login.jsx`  
**Status:** Open

### Description
The show/hide password toggle on the login form uses a `<span>` element with an `onClick` handler instead of a `<button>`. Screen readers cannot identify it as interactive and keyboard users cannot activate it using Tab + Enter/Space.

### Reproduction
1. Navigate to `/login`, select any role, view the password field.
2. Use Tab key to cycle through interactive elements.
3. The eye icon is skipped — it is unreachable by keyboard.

### Evidence (from test)
```js
// Login.test.jsx — documents the accessibility bug
const toggleSpan = screen.getByText('visibility');
expect(toggleSpan.tagName.toLowerCase()).toBe('span'); // should be 'button'
```

### Fix Recommendation
Replace `<span onClick={...}>` with `<button type="button" onClick={...} aria-label="Show password">`. Add `cursor: pointer` styling.

---

## Bug #4 — PARENT Role Has No Dashboard Route

**Severity:** Medium  
**Area:** Frontend — `AuthContext.jsx` → `getDashboardPath()`  
**Status:** Open

### Description
`getDashboardPath()` in `AuthContext` does not handle the `PARENT` role. A user logging in as PARENT falls through all role checks and receives `/login` as the dashboard path, causing an immediate redirect loop after authentication.

### Reproduction
1. Log in with a PARENT user account.
2. Observe redirect back to `/login` after successful login.

### Evidence (from test)
```js
// AuthContext.test.jsx
it('PARENT role falls back to /login', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.login({ role: 'PARENT' }, 'tok'));
    expect(result.current.getDashboardPath()).toBe('/login'); // should be '/parent/dashboard'
});
```

### Fix Recommendation
Add a `PARENT` case to `getDashboardPath()` in [AuthContext.jsx](../client/src/context/AuthContext.jsx):
```js
case 'PARENT': return '/parent/dashboard';
```

---

## Bug #5 — Duplicate API Functions for OTP / Forgot-Password Flow

**Severity:** Medium  
**Area:** Frontend — `api.js` service layer  
**Status:** Open

### Description
The API service layer defines four functions where two pairs are identical duplicates:

- `sendLoginOTP(identifier)` and `forgotPassword(identifier)` — both call `POST /api/auth/forgot-password`
- `verifyLoginOTP(identifier, otp)` and `verifyOTP(identifier, otp)` — both call `POST /api/auth/verify-otp`

The duplication creates confusion about which function to call, risks divergence if one is updated and the other isn't, and increases the bundle size unnecessarily.

### Evidence (from test)
```js
// api.test.js
expect(API.sendLoginOTP.toString()).toBe(API.forgotPassword.toString());
expect(API.verifyLoginOTP.toString()).toBe(API.verifyOTP.toString());
```

### Fix Recommendation
Remove `sendLoginOTP` and `verifyLoginOTP`. Update all callers to use `forgotPassword` and `verifyOTP` consistently.

---

## Bug #6 — VITE_API_URL Points to Production Server in .env

**Severity:** Low  
**Area:** Frontend — `.env`  
**Status:** Open

### Description
The committed `.env` file sets:
```
VITE_API_URL=https://application-school.onrender.com
```
All local development API calls go to the production Render.com server instead of the local backend on `localhost:8080`. Developers cannot test locally against their own backend without overriding this variable.

### Fix Recommendation
1. Add `.env` to `.gitignore`
2. Create `.env.example` with `VITE_API_URL=http://localhost:8080`
3. Create `.env.local` (gitignored) with `VITE_API_URL=http://localhost:8080` for local dev
4. Keep production URL in a CI/CD environment variable, not in the committed `.env`

---

## Bug #7 — PWA Icons Are Missing

**Severity:** Low  
**Area:** Frontend — `public/` directory  
**Status:** Open

### Description
`manifest.json` references `/icon-192.png` and `/icon-512.png` but neither file exists in the `public/` directory. This causes:
- Chrome's "Add to Home Screen" prompt to fail silently
- The PWA install badge to show a broken image
- Lighthouse PWA audit failures

### Fix Recommendation
Generate and add PNG icons at both sizes to `client/public/`:
```
client/public/icon-192.png   (192×192 px)
client/public/icon-512.png   (512×512 px)
```

---

## Test Infrastructure Notes

### Backend `@WebMvcTest` + `SecurityConfig`
Spring Boot's `@WebMvcTest` slice does **not** include `@Configuration` beans by default. `SecurityConfig` must be explicitly imported via `@Import(SecurityConfig.class)` in controller tests, otherwise Spring falls back to its default auto-configured security (all endpoints require authentication).

Additionally, `@MockBean JwtFilter` is required so that `SecurityConfig` can autowire the filter without needing the real `JwtFilter` bean in the test slice. The mock is configured with a pass-through `doAnswer` in `@BeforeEach`.

This pattern is documented in [AdminControllerTest.java](../server/src/test/java/com/schoolers/controller/AdminControllerTest.java).

/**
 * teacherCredentialStore.js
 * Previously used localStorage to cache teacher credentials for offline fallback.
 * All credentials are now stored exclusively in the database (users table).
 * These functions are kept as no-ops for backward compatibility with any callers.
 */

export const saveTeacherCredential   = () => {};
export const updateTeacherPassword   = () => {};
export const lookupTeacherCredential = ()  => undefined;
export const removeTeacherCredential = () => {};

export default { saveTeacherCredential, updateTeacherPassword, lookupTeacherCredential, removeTeacherCredential };

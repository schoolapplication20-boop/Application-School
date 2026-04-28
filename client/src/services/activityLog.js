const MAX_LOGS = 50;

// Keyed by schoolId (string) so each school only sees its own activity.
// schoolId null/undefined is treated as the platform-level (APPLICATION_OWNER) bucket.
const _logsBySchool = {};

const bucketKey = (schoolId) => (schoolId != null ? String(schoolId) : '__platform__');

export const getLogs = (schoolId) => {
  const key = bucketKey(schoolId);
  return [...(_logsBySchool[key] ?? [])];
};

export const addLog = (adminName, action, module, schoolId) => {
  const key = bucketKey(schoolId);
  const newLog = {
    id: Date.now(),
    adminName,
    action,
    module,
    timestamp: new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }),
  };
  _logsBySchool[key] = [newLog, ...(_logsBySchool[key] ?? [])].slice(0, MAX_LOGS);
};

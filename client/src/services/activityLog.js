const STORAGE_KEY = 'schoolers_activity_logs';
const MAX_LOGS = 50;

export const getLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const addLog = (adminName, action, module) => {
  try {
    const existing = getLogs();
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
    const updated = [newLog, ...existing].slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // storage not available
  }
};

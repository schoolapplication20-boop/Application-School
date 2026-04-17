const MAX_LOGS = 50;

// In-memory activity log — nothing is persisted to localStorage
let _logs = [];

export const getLogs = () => [..._logs];

export const addLog = (adminName, action, module) => {
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
  _logs = [newLog, ..._logs].slice(0, MAX_LOGS);
};

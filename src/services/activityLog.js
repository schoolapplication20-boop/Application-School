export const getLogs = () => [];

export const addLog = (adminName, action, module) => {
  console.log(`[ActivityLog] ${adminName} — ${module}: ${action}`);
};

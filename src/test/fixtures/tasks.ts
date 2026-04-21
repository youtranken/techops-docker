// Task test fixtures
export const mockTask = {
  id: "clxxxxxx",
  title: "Test Task",
  content: "Test content",
  status: "DRAFT",
  workflowMode: "IMMEDIATE",
  isForceMode: false,
  allFailed: false,
  scheduleStart: new Date().toISOString(),
  scheduleEnd: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
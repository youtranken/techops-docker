// Settings module — public API barrel export
// Internal structure: types → services → hooks → components

export * from './types';

// Hooks (client-side)
export { usePriorities, useCreatePriority, useUpdatePriority, useDeletePriority } from './hooks/usePriorities';
export { useTaskTypes, useCreateTaskType, useUpdateTaskType, useDeleteTaskType } from './hooks/useTaskTypes';
export { useProfile, useUpdateProfile } from './hooks/useProfile';
export { useNotificationPrefs, useUpdateNotificationPrefs, NOTIFICATION_TYPES } from './hooks/useNotificationPrefs';
export { useSmtpConfig, useUpdateSmtpConfig, useTestSmtp } from './hooks/useSmtp';
export { useSecurityConfig } from './hooks/useSecurityConfig';

// Components (for use in page.tsx)
export { SettingsClient } from './components/SettingsClient';

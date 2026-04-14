export interface ApiError {
  code: string; // e.g. 'TASK_NOT_FOUND', 'PERMISSION_DENIED'
  message: string;
  details?: Record<string, any>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

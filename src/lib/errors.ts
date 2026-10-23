/**
 * Lỗi server → câu dễ hiểu, song ngữ (A1.3). Chỉ đổi CHỮ HIỂN THỊ, không đổi luồng.
 *
 *   const errMsg = useErrorMessage();          // src/lib/useErrorMessage.ts (client)
 *   onError: (err) => toast.error(errMsg(err))
 *   // hoặc khi đã có t + locale:
 *   toast.error(toUserMessage(err, t, { locale }))
 *
 * Thứ tự dò:
 *  1. message chính là MÃ (vd 'PRIORITY_IN_USE', 'SMTP_DECRYPT_FAILED: …') → bảng mã.
 *  2. message tiếng Anh đã biết (auth-utils, rate-limit, upload…) → câu tương ứng.
 *  3. message tiếng Việt từ server + giao diện vi → giữ nguyên (đã dễ hiểu, cụ thể hơn câu chung).
 *  4. mã trong body (`error.code`) → bảng mã; rồi tới HTTP status.
 *  5. không biết → câu chung (kèm mã nếu có).
 */
import type { Locale, Translate } from '@/i18n/locale';

export type { Translate };

export interface ErrorInfo {
  code?: string;
  message?: string;
  status?: number;
}

/** Lỗi gọi API có kèm mã + HTTP status (message giữ nguyên như trước). */
export class ApiError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    if (code) this.code = code;
    if (status) this.status = status;
  }
}

type ApiBody = { error?: { code?: unknown; message?: unknown } | string | null } | null | undefined;

/** Tạo lỗi từ body JSON API (`{ error: { code, message } }`) — thay `new Error(body.error?.message ?? fallback)`. */
export function toApiError(body: ApiBody | unknown, fallback: string, status?: number): ApiError {
  const e = (body as ApiBody)?.error;
  const message = typeof e === 'object' && e && typeof e.message === 'string' && e.message ? e.message : typeof e === 'string' && e ? e : fallback;
  const code = typeof e === 'object' && e && typeof e.code === 'string' ? e.code : undefined;
  return new ApiError(message, code, status);
}

const CODE_RE = /^([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+|[A-Z]{4,})(?::\s*[\s\S]*)?$/;

/** Gom mọi kiểu lỗi (Error, ApiError, body API, chuỗi) về { code, message, status }. */
export function extractError(err: unknown): ErrorInfo {
  if (err === null || err === undefined) return {};
  if (typeof err === 'string') return withCodeFromMessage({ message: err });
  if (typeof err !== 'object') return {};

  const o = err as Record<string, unknown>;
  // Body API: { error: { code, message } } hoặc { error: 'chuỗi' }
  if (!(err instanceof Error) && o.error !== undefined && o.error !== null) {
    if (typeof o.error === 'string') return withCodeFromMessage({ message: o.error });
    if (typeof o.error === 'object') return extractError(o.error);
  }
  const info: ErrorInfo = {};
  if (typeof o.message === 'string' && o.message) info.message = o.message;
  if (typeof o.code === 'string' && o.code) info.code = o.code;
  if (typeof o.status === 'number') info.status = o.status;
  return info.code ? info : withCodeFromMessage(info);
}

function withCodeFromMessage(info: ErrorInfo): ErrorInfo {
  const m = info.message ? CODE_RE.exec(info.message.trim()) : null;
  return m ? { code: m[1], ...info } : info;
}

type Hit = { key: string; values?: Record<string, string | number> };

/** Mã lỗi (server trả trong error.code hoặc message) → khoá err.* */
export const CODE_KEYS: Record<string, string> = {
  UNAUTHORIZED: 'err.auth',
  FORBIDDEN: 'err.forbidden',
  PERMISSION_DENIED: 'err.forbidden',
  COMMENT_PERMISSION_DENIED: 'err.forbidden',
  COMMENT_FORBIDDEN: 'err.forbidden',
  RATE_LIMITED: 'err.rateLimit',
  VALIDATION_ERROR: 'err.invalid',
  VALIDATION_FAILED: 'err.invalid',
  INVALID_INPUT: 'err.invalid',
  INVALID_BODY: 'err.invalid',
  INVALID_DATA: 'err.invalid',
  INVALID_DATE: 'err.invalid',
  INVALID_EMAIL: 'err.invalid',
  NOT_FOUND: 'err.notFound',
  TASK_NOT_FOUND: 'err.taskNotFound',
  USER_NOT_FOUND: 'err.userNotFound',
  COMMENT_NOT_FOUND: 'err.commentNotFound',
  EXTENSION_NOT_FOUND: 'err.extNotFound',
  HELPDESK_PENDING_NOT_FOUND: 'err.notFound',
  INVALID_STATUS: 'err.statusChanged',
  NOT_ASSIGNEE: 'err.notAssignee',
  ASSIGNEES_REQUIRED: 'err.assigneesRequired',
  NO_ASSIGNEES: 'err.assigneesRequired',
  SAME_USER: 'err.sameUser',
  FORCE_MODE: 'err.forceMode',
  FORCE_MODE_REQUIRES_APPROVAL: 'err.forceModeApproval',
  FLOW_SWITCH_NOT_ALLOWED: 'err.flowSwitch',
  FLOW_SWITCH_FORBIDDEN_PENDING_REVIEW: 'err.flowSwitch',
  REPORT_REQUIRED: 'err.reportRequired',
  EXTENSION_INVALID_DATE: 'err.extDate',
  EXTENSION_PENDING_LIMIT: 'err.extPending',
  EXTENSION_MAX_REACHED: 'err.extMax',
  PRIORITY_IN_USE: 'err.priorityInUse',
  TASK_TYPE_IN_USE: 'err.taskTypeInUse',
  SMTP_DECRYPT_FAILED: 'err.smtpDecrypt',
  SMTP_KEY_MISSING: 'err.smtpKey',
  SMTP_ERROR: 'err.smtp',
  EMAIL_FAILED: 'err.emailFailed',
  PASSWORD_REQUIRED: 'err.passwordRequired',
  PASSWORD_POLICY_VIOLATION: 'err.weakPassword',
  WEAK_PASSWORD: 'err.weakPassword',
  WRONG_PASSWORD: 'err.wrongPassword',
  SAME_PASSWORD: 'err.samePassword',
  USER_DUPLICATE: 'err.userDuplicate',
  USER_INACTIVE: 'err.userInactive',
  USER_HAS_TASKS: 'err.userHasTasks',
  OTP_INVALID: 'err.otp',
  OTP_REQUIRED: 'err.otp',
  FILE_TOO_LARGE: 'err.fileTooLarge',
  PAYLOAD_TOO_LARGE: 'err.fileTooLarge',
  FILE_LIMIT_EXCEEDED: 'err.fileLimit',
  INVALID_FILE: 'err.fileTypeAny',
  INVALID_TYPE: 'err.fileTypeAny',
  SERVICE_UNAVAILABLE: 'err.unavailable',
  INTERNAL_ERROR: 'err.server',
};

/** Thông điệp tiếng Anh server/trình duyệt đang trả → khoá err.* */
const MESSAGE_RULES: Array<[RegExp, (m: RegExpExecArray) => Hit]> = [
  [/^(Insufficient permissions|Access denied|Forbidden)\.?$/i, () => ({ key: 'err.forbidden' })],
  [/^(Authentication required|Not logged in|Unauthorized)\.?$/i, () => ({ key: 'err.auth' })],
  [/^Too many requests/i, () => ({ key: 'err.rateLimit' })],
  [/^Invalid origin$/i, () => ({ key: 'err.origin' })],
  [/^Invalid (input|path)$/i, () => ({ key: 'err.invalid' })],
  [/^User not found$/i, () => ({ key: 'err.userNotFound' })],
  [/^[\w ]*not found$/i, () => ({ key: 'err.notFound' })],
  [/^File type (\S+) not allowed/i, (m) => ({ key: 'err.fileType', values: { ext: m[1] } })],
  [/^File (.+) exceeds (\d+(?:\.\d+)?)\s?MB limit/i, (m) => ({ key: 'err.fileTooLargeNamed', values: { name: m[1], max: m[2] } })],
  [/^(Failed to fetch|Load failed|Network ?Error|NetworkError when attempting to fetch resource\.?|Network request failed)/i, () => ({ key: 'err.network' })],
  [/^(Server error|Internal server error)\.?$/i, () => ({ key: 'err.server' })],
  [/^Unexpected (token|end of JSON)|is not valid JSON|JSON\.parse/i, () => ({ key: 'err.server' })],
  [/^(Failed to \w+|Bulk action failed|Permission check failed|Unknown error)/i, () => ({ key: 'err.failed' })],
];

const STATUS_KEYS: Array<[(s: number) => boolean, string]> = [
  [(s) => s === 401, 'err.auth'],
  [(s) => s === 403, 'err.forbidden'],
  [(s) => s === 404, 'err.notFound'],
  [(s) => s === 413, 'err.fileTooLarge'],
  [(s) => s === 429, 'err.rateLimit'],
  [(s) => s === 503, 'err.unavailable'],
  [(s) => s >= 500, 'err.server'],
];

/** Có dấu tiếng Việt → coi là câu đã viết cho người dùng. */
const VIET_RE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** Tìm khoá cho lỗi (không dịch) — tách riêng để dễ test/tái dùng. */
export function errorHit(info: ErrorInfo): Hit | null {
  const msg = info.message?.trim();
  if (msg) {
    const codeInMsg = CODE_RE.exec(msg)?.[1];
    if (codeInMsg && CODE_KEYS[codeInMsg]) return { key: CODE_KEYS[codeInMsg] };
    for (const [re, make] of MESSAGE_RULES) {
      const m = re.exec(msg);
      if (m) return make(m);
    }
  }
  return null;
}

export interface ToUserMessageOptions {
  /** Ngôn ngữ giao diện; mặc định 'vi' */
  locale?: Locale;
  /** Câu dự phòng (tiếng Việt) của màn hình khi lỗi không có message — vi hiện nguyên câu, en hiện câu chung */
  fallback?: string;
}

/** Lỗi bất kỳ → câu dễ hiểu theo ngôn ngữ hiện tại. */
export function toUserMessage(err: unknown, t: Translate, opts: ToUserMessageOptions = {}): string {
  const locale = opts.locale ?? 'vi';
  const info = extractError(err);
  if (!info.message && opts.fallback) info.message = opts.fallback;

  const hit = errorHit(info);
  if (hit) return t(hit.key, hit.values);

  const msg = info.message?.trim();
  if (locale === 'vi' && msg && VIET_RE.test(msg) && !CODE_RE.test(msg)) return msg;

  if (info.code && CODE_KEYS[info.code]) return t(CODE_KEYS[info.code]);
  if (info.status) {
    const s = STATUS_KEYS.find(([test]) => test(info.status!));
    if (s) return t(s[1]);
  }
  return info.code ? t('err.genericCode', { code: info.code }) : t('err.generic');
}

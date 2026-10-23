import { describe, it, expect } from 'vitest';
import { translator } from '@/test/translator';
import { toUserMessage, extractError, ApiError, toApiError } from '../errors';

const tVi = translator('vi');
const tEn = translator('en');
const VI = (err: unknown, fallback?: string) => toUserMessage(err, tVi, { locale: 'vi', fallback });
const EN = (err: unknown, fallback?: string) => toUserMessage(err, tEn, { locale: 'en', fallback });

describe('extractError — gom mọi kiểu lỗi về {code, message, status}', () => {
  it('Error thường', () => expect(extractError(new Error('Insufficient permissions'))).toEqual({ message: 'Insufficient permissions' }));
  it('ApiError mang code + status', () => {
    expect(extractError(new ApiError('Không đủ quyền', 'FORBIDDEN', 403))).toEqual({ message: 'Không đủ quyền', code: 'FORBIDDEN', status: 403 });
  });
  it('body API { error: { code, message } } và object { code, message }', () => {
    expect(extractError({ error: { code: 'NOT_FOUND', message: 'x' } })).toEqual({ code: 'NOT_FOUND', message: 'x' });
    expect(extractError({ code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' })).toMatchObject({ code: 'RATE_LIMITED' });
  });
  it('message chính là mã (route PUT /tasks/[id] trả message = code)', () => {
    expect(extractError(new Error('PRIORITY_IN_USE'))).toEqual({ code: 'PRIORITY_IN_USE', message: 'PRIORITY_IN_USE' });
  });
  it('message dạng "MÃ: mô tả" (crypto.ts)', () => {
    expect(extractError(new Error('SMTP_DECRYPT_FAILED: Cấu hình SMTP đã được mã hóa với key khác'))).toMatchObject({ code: 'SMTP_DECRYPT_FAILED' });
  });
  it('chuỗi / null', () => {
    expect(extractError('Lỗi khi lưu')).toEqual({ message: 'Lỗi khi lưu' });
    expect(extractError(null)).toEqual({});
  });
});

describe('toApiError — tạo lỗi từ body API, giữ nguyên message như cũ', () => {
  it('lấy message + code từ body', () => {
    const e = toApiError({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 'Thất bại', 403);
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Insufficient permissions');
    expect(e.code).toBe('FORBIDDEN');
    expect(e.status).toBe(403);
  });
  it('body rỗng → message dự phòng', () => {
    expect(toApiError(undefined, 'Duyệt công việc thất bại').message).toBe('Duyệt công việc thất bại');
  });
});

describe('toUserMessage — quyền / đăng nhập / giới hạn tần suất', () => {
  it('Insufficient permissions, Access denied, FORBIDDEN', () => {
    expect(VI(new Error('Insufficient permissions'))).toBe('Bạn không có quyền thực hiện thao tác này.');
    expect(EN(new Error('Access denied'))).toBe('You don’t have permission to do that.');
    expect(EN(new ApiError('FORBIDDEN', 'FORBIDDEN'))).toBe('You don’t have permission to do that.');
  });
  it('Authentication required / Not logged in / 401', () => {
    expect(VI(new Error('Authentication required'))).toBe('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
    expect(EN(new Error('Not logged in'))).toBe('Your session has ended. Please sign in again.');
    expect(EN(new ApiError('x', undefined, 401))).toBe('Your session has ended. Please sign in again.');
  });
  it('Too many requests / RATE_LIMITED / 429', () => {
    expect(VI(new Error('Too many requests. Please try again later.'))).toBe('Bạn thao tác quá nhanh. Đợi một lát rồi thử lại.');
    expect(EN({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } })).toBe(
      'You’re going a bit fast. Wait a moment and try again.',
    );
  });
  it('Invalid origin', () => {
    expect(VI(new ApiError('Invalid origin', 'FORBIDDEN', 403))).toBe('Yêu cầu bị chặn vì không đến từ trang TechOps. Tải lại trang rồi thử lại.');
  });
});

describe('toUserMessage — dữ liệu / không tìm thấy', () => {
  it('Invalid input / VALIDATION_FAILED', () => {
    expect(VI(new Error('Invalid input'))).toBe('Dữ liệu chưa hợp lệ. Kiểm tra lại các ô đã nhập.');
    expect(EN(new ApiError('Dữ liệu không hợp lệ', 'VALIDATION_FAILED', 400))).toBe('Some fields aren’t valid. Check what you entered.');
  });
  it('User not found / TASK_NOT_FOUND / 404', () => {
    expect(EN(new Error('User not found'))).toBe('That user no longer exists.');
    expect(VI(new Error('TASK_NOT_FOUND'))).toBe('Không tìm thấy công việc, có thể đã bị xoá.');
    expect(EN(new ApiError('x', undefined, 404))).toBe('We couldn’t find that. It may have been deleted.');
  });
});

describe('toUserMessage — mã nghiệp vụ', () => {
  it('ASSIGNEES_REQUIRED', () => {
    expect(VI(new Error('ASSIGNEES_REQUIRED'))).toBe('Chọn ít nhất 1 người làm.');
    expect(EN(new Error('ASSIGNEES_REQUIRED'))).toBe('Pick at least one assignee.');
  });
  it('PRIORITY_IN_USE / TASK_TYPE_IN_USE', () => {
    expect(VI(new Error('PRIORITY_IN_USE'))).toBe('Mức ưu tiên này đang được dùng ở công việc nên chưa xoá được.');
    expect(EN(new Error('TASK_TYPE_IN_USE'))).toBe('This task type is used by some tasks, so it can’t be deleted yet.');
  });
  it('SMTP_DECRYPT_FAILED (kèm mô tả sau dấu ":")', () => {
    const e = new Error('SMTP_DECRYPT_FAILED: Cấu hình SMTP đã được mã hóa với key khác hoặc bị hỏng.');
    expect(VI(e)).toBe('Không đọc được cấu hình SMTP đã lưu (khoá mã hoá đã đổi). Nhập lại cấu hình SMTP rồi lưu.');
    expect(EN(e)).toBe('The saved SMTP settings can’t be read (the encryption key changed). Enter the SMTP settings again and save.');
  });
  it('FLOW_SWITCH_* và FORCE_MODE_REQUIRES_APPROVAL', () => {
    expect(EN(new Error('FLOW_SWITCH_NOT_ALLOWED'))).toBe('The workflow can’t be changed at this stage.');
    expect(EN(new Error('FLOW_SWITCH_FORBIDDEN_PENDING_REVIEW'))).toBe('The workflow can’t be changed at this stage.');
    expect(VI(new Error('FORCE_MODE_REQUIRES_APPROVAL'))).toBe('Chế độ Bắt buộc chỉ dùng được với quy trình Phê duyệt.');
  });
  it('INVALID_STATUS chỉ có mã → câu "trạng thái đã đổi"', () => {
    expect(EN(new ApiError('INVALID_STATUS', 'INVALID_STATUS', 400))).toBe('This task’s status has changed. Reload the page and try again.');
  });
});

describe('toUserMessage — tệp', () => {
  it('File type .x not allowed', () => {
    expect(VI(new Error('File type .exe not allowed. Only PDF files accepted.'))).toBe('Không nhận tệp .exe. Chỉ nhận tệp PDF.');
    expect(EN(new Error('File type .exe not allowed. Only PDF files accepted.'))).toBe('.exe files aren’t allowed. Only PDF files are accepted.');
  });
  it('File x exceeds nMB limit', () => {
    expect(VI(new Error('File bao-cao.pdf exceeds 10MB limit'))).toBe('Tệp bao-cao.pdf vượt quá 10 MB.');
    expect(EN(new Error('File bao-cao.pdf exceeds 10MB limit'))).toBe('bao-cao.pdf is larger than 10 MB.');
  });
  it('PAYLOAD_TOO_LARGE / 413', () => {
    expect(EN(new ApiError('x', 'PAYLOAD_TOO_LARGE', 413))).toBe('The file is too large.');
  });
});

describe('toUserMessage — mạng / máy chủ', () => {
  it('Failed to fetch (mất mạng)', () => {
    expect(VI(new TypeError('Failed to fetch'))).toBe('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    expect(EN(new TypeError('NetworkError when attempting to fetch resource.'))).toBe('Can’t reach the server. Check your connection and try again.');
  });
  it('Server error / INTERNAL_ERROR / 5xx / phản hồi không phải JSON', () => {
    const vi500 = 'Máy chủ gặp sự cố, thao tác chưa được lưu. Thử lại sau ít phút.';
    expect(VI(new Error('Server error'))).toBe(vi500);
    expect(VI(new ApiError('x', 'INTERNAL_ERROR', 500))).toBe(vi500);
    expect(VI(new SyntaxError('Unexpected token < in JSON at position 0'))).toBe(vi500);
  });
  it('Failed to create user… → câu chung "chưa thực hiện được"', () => {
    expect(EN(new Error('Failed to create user'))).toBe('That didn’t go through. Try again in a few minutes.');
  });
});

describe('toUserMessage — thông điệp tiếng Việt từ server', () => {
  const msg = 'Chỉ Admin mới có thể khôi phục công việc';
  it('giao diện vi: giữ nguyên câu server (đã dễ hiểu, cụ thể hơn)', () => {
    expect(VI(new ApiError(msg, 'FORBIDDEN', 403))).toBe(msg);
    expect(VI(new Error('Ngày gia hạn phải sau hạn hiện tại'))).toBe('Ngày gia hạn phải sau hạn hiện tại');
  });
  it('giao diện en: dịch theo mã nếu biết', () => {
    expect(EN(new ApiError(msg, 'FORBIDDEN', 403))).toBe('You don’t have permission to do that.');
  });
  it('giao diện en, không có mã → câu chung', () => {
    expect(EN(new Error('Ngày gia hạn phải sau hạn hiện tại'))).toBe('Something went wrong and the action wasn’t completed.');
  });
});

describe('toUserMessage — lỗi không biết', () => {
  it('có mã → câu chung kèm mã', () => {
    expect(VI(new Error('WEIRD_THING'))).toBe('Có lỗi xảy ra, thao tác chưa thực hiện được (mã WEIRD_THING).');
    expect(EN(new ApiError('boom', 'EXEC_FAILED', 400))).toBe('Something went wrong and the action wasn’t completed (code EXEC_FAILED).');
  });
  it('không có mã → câu chung', () => {
    expect(VI(new Error('kaboom'))).toBe('Có lỗi xảy ra, thao tác chưa thực hiện được.');
    expect(EN(undefined)).toBe('Something went wrong and the action wasn’t completed.');
  });
  it('fallback tiếng Việt của màn hình: vi hiện fallback, en hiện câu chung', () => {
    expect(VI(null, 'Lỗi khi lưu')).toBe('Lỗi khi lưu');
    expect(EN(null, 'Lỗi khi lưu')).toBe('Something went wrong and the action wasn’t completed.');
  });
});

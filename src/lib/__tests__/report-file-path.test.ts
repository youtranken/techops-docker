import { describe, it, expect } from 'vitest';
import { isOwnReportFilePath } from '../report-file-path';

const TASK = 'cmtask123';

describe('isOwnReportFilePath — file báo cáo phải nằm trong thư mục reports của chính task', () => {
  it('chấp nhận đường dẫn do /api/upload trả về cho task này', () => {
    expect(isOwnReportFilePath(TASK, `${TASK}/reports/1760000000000-bao_cao.xlsx`)).toBe(true);
  });

  it.each([
    ['task khác', 'cmother999/attachments/1-salary.pdf'],
    ['task khác (reports)', 'cmother999/reports/1-x.pdf'],
    ['thư mục khác của cùng task', `${TASK}/attachments/1-x.pdf`],
    ['path traversal', `${TASK}/reports/../../cmother999/attachments/x.pdf`],
    ['thư mục con', `${TASK}/reports/sub/x.pdf`],
    ['đường dẫn tuyệt đối', `/etc/passwd`],
    ['ổ đĩa Windows', 'C:\\x.pdf'],
    ['backslash', TASK + '\\reports\\x.pdf'],
    ['URL', 'http://evil/x.pdf'],
    ['misc', 'misc/1-x.pdf'],
    ['rỗng', ''],
  ])('từ chối: %s', (_label, p) => {
    expect(isOwnReportFilePath(TASK, p)).toBe(false);
  });
});

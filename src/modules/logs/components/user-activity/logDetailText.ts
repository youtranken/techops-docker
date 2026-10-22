export function logDetailText(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;

  // LOGIN_FAILED: hiển thị lý do
  const reason = metadata.reason as string | undefined;
  if (reason === 'USER_NOT_FOUND') return 'Username không tồn tại';
  if (reason === 'USER_INACTIVE')  return 'Tài khoản đã vô hiệu hoá';
  if (reason === 'WRONG_PASSWORD') {
    const remaining = metadata.attemptsRemaining;
    const locked = metadata.locked;
    if (locked) return 'Mật khẩu sai — IP đã bị khoá';
    if (typeof remaining === 'number') return `Mật khẩu sai — còn ${remaining} lần`;
    return 'Mật khẩu sai';
  }

  const s = metadata.setting as string | undefined;
  if (!s) return null;

  if (s === 'security_config') {
    if (metadata.action === 'reset_to_default') return 'Bảo mật: khôi phục mặc định';
    const changes = metadata.changes as string[] | undefined;
    return changes?.length ? `Bảo mật: đổi ${changes.join(', ')}` : 'Bảo mật';
  }
  if (s === 'notification_prefs') return `Thông báo email: ${metadata.emailEnabled ? 'bật' : 'tắt'}`;
  if (s === 'smtp')              return 'Cấu hình SMTP';
  if (s === 'task_type_created') return `Loại task: ${metadata.name ?? ''}`;
  if (s === 'priority_created')  return `Độ ưu tiên: ${metadata.name ?? ''}`;
  if (s === 'digest_config')     return `Digest email: ${metadata.enabled ? 'bật' : 'tắt'}`;
  if (s === 'email_template')    return `Mẫu email: ${metadata.key ?? ''}`;
  return s;
}

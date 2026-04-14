export function logDetailText(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
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

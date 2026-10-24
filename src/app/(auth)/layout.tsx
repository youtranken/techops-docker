import { ThemeProvider } from '@/shared/providers/ThemeProvider';
import { AuthShell } from '@/modules/auth/components/AuthShell';

/** Trang xác thực (đăng nhập, đổi mật khẩu lần đầu, đặt lại mật khẩu, xác nhận email): không sidebar. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthShell>{children}</AuthShell>
    </ThemeProvider>
  );
}

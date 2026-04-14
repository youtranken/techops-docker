'use client';

import { CheckCircle2, Trash2, AlertTriangle, HelpCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ModalVariant = 'default' | 'success' | 'destructive';
type ModalIcon = 'check' | 'trash' | 'warning' | 'question';

type Theme = { heroBg: string; circleBg: string; iconColor: string; ring: string; btn: string };

const variantTheme: Record<ModalVariant, Theme> = {
  default:     { heroBg: 'bg-indigo-50 dark:bg-indigo-950/30', circleBg: 'bg-indigo-100 dark:bg-indigo-900/50', iconColor: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-200/60 dark:ring-indigo-800/30', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white border-0' },
  success:     { heroBg: 'bg-indigo-50 dark:bg-indigo-950/30', circleBg: 'bg-indigo-100 dark:bg-indigo-900/50', iconColor: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-200/60 dark:ring-indigo-800/30', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white border-0' },
  destructive: { heroBg: 'bg-red-50 dark:bg-red-950/30',    circleBg: 'bg-red-100 dark:bg-red-900/50',    iconColor: 'text-red-600 dark:text-red-400',       ring: 'ring-red-200/60 dark:ring-red-800/30',    btn: 'bg-red-600 hover:bg-red-700 text-white border-0' },
};

const iconMap: Record<ModalIcon, React.ReactNode> = {
  check:    <CheckCircle2 className="h-6 w-6" />,
  trash:    <Trash2 className="h-6 w-6" />,
  warning:  <AlertTriangle className="h-6 w-6" />,
  question: <HelpCircle className="h-6 w-6" />,
};

interface ConfirmActionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  icon?: ModalIcon;
  variant?: ModalVariant;
}

export function ConfirmActionModal({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Xác nhận', isDestructive = false,
  isLoading = false, icon, variant = 'default',
}: ConfirmActionModalProps) {
  const t = variantTheme[isDestructive ? 'destructive' : variant];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
        <div className={`${t.heroBg} pt-5 pb-3 px-6 text-center`}>
          {icon && (
            <div className={`w-12 h-12 rounded-full ${t.circleBg} flex items-center justify-center mx-auto mb-2 ring-4 ${t.ring}`}>
              <span className={t.iconColor}>{iconMap[icon]}</span>
            </div>
          )}
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</DialogTitle>
        </div>
        <div className="px-6 py-4">
          <DialogDescription className="text-sm text-gray-500 dark:text-slate-400 text-center">{description}</DialogDescription>
        </div>
        <DialogFooter className="flex-col gap-2 px-6 pb-6 pt-0">
          <Button onClick={onConfirm} disabled={isLoading} className={`w-full ${t.btn}`}>
            {isLoading ? 'Đang xử lý...' : confirmLabel}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isLoading} className="w-full">Hủy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

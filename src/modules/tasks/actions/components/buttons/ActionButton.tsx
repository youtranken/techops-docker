'use client';

import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

// Extended variant includes semantic 'success' (green) for approve actions
type ActionVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning' | 'blue';

const variantClass: Record<ActionVariant, string> = {
  default:     '',
  destructive: '',
  outline:     '',
  secondary:   '',
  success:     'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent',
  warning:     'bg-amber-500 hover:bg-amber-600 text-white border-transparent',
  blue:        'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
};

interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  variant?: ActionVariant;
  onClick: () => void;
  isVisible: boolean;
  isLoading?: boolean;
  size?: 'sm' | 'default';
}

export function ActionButton({
  label, icon: Icon, variant = 'default', onClick, isVisible, isLoading = false, size = 'sm',
}: ActionButtonProps) {
  if (!isVisible) return null;

  type ShadcnVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  const shadcnVariant: ShadcnVariant = (['success', 'warning', 'blue'] as ActionVariant[]).includes(variant) ? 'default' : (variant as ShadcnVariant);

  return (
    <Button
      variant={shadcnVariant}
      size={size}
      onClick={onClick}
      disabled={isLoading}
      className={`gap-1.5 ${variantClass[variant]}`}
    >
      <Icon className="h-4 w-4" />
      {isLoading ? 'Đang xử lý...' : label}
    </Button>
  );
}

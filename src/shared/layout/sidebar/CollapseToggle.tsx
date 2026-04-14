import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapseToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * Sidebar collapse toggle button
 */
export function CollapseToggle({ collapsed, onToggle }: CollapseToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'absolute -right-3 top-20 w-6 h-6 rounded-full border-2 border-gray-700',
        'bg-gray-900 flex items-center justify-center',
        'hover:bg-gray-800 transition-colors z-10'
      )}
      title={collapsed ? 'Mở rộng' : 'Thu gọn'}
    >
      {collapsed ? (
        <ChevronRight className="w-3 h-3 text-gray-400" />
      ) : (
        <ChevronLeft className="w-3 h-3 text-gray-400" />
      )}
    </button>
  );
}

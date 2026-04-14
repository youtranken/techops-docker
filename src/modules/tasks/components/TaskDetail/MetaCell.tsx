'use client';

/** Shared MetaCell — dùng chung cho DetailHero, QuickViewMeta */

interface MetaCellProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  mono?: boolean;
}

export function MetaCell({ icon: Icon, iconBg, iconColor, label, value, valueClass, mono }: MetaCellProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-800/40">
      <div className={`shrink-0 rounded-md p-1.5 ${iconBg}`}>
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <div className={`text-xs font-semibold truncate ${mono ? 'font-mono' : ''} ${valueClass ?? 'text-slate-700 dark:text-slate-300'}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

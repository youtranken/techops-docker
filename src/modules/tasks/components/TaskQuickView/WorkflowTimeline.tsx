import { Check } from 'lucide-react';
import type { TaskStatus } from '@prisma/client';
import { getStepState, getTimelineData } from './workflowTimeline.utils';

interface WorkflowTimelineProps {
  status: TaskStatus;
  workflowMode: string;
  compact?: boolean;
}

export function WorkflowTimeline({ status, workflowMode, compact = false }: WorkflowTimelineProps) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
        <span className="text-xs font-medium text-slate-500 line-through">Công việc đã bị hủy</span>
      </div>
    );
  }

  const { steps, order } = getTimelineData(workflowMode, status);

  /* ── COMPACT: horizontal stepper (circle + connector + label below) ── */
  if (compact) {
    return (
      <div className="flex items-start w-full">
        {steps.map((step, idx) => {
          const state  = getStepState(step.key, status, order);
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 min-w-0">
              {/* Circle + connector */}
              <div className="flex items-center w-full">
                <div className={`h-px flex-1 ${idx === 0 ? 'invisible' : state === 'done' || state === 'active' ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                <div className={[
                  'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                  state === 'done'    ? 'bg-indigo-500 border-indigo-500' : '',
                  state === 'active'  ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.15)]' : '',
                  state === 'pending' ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600' : '',
                ].join(' ')}>
                  {state === 'done'    && <Check className="w-3.5 h-3.5 text-white" />}
                  {state === 'active'  && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />}
                  {state === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-200" />}
                </div>
                <div className={`h-px flex-1 ${isLast ? 'invisible' : state === 'done' ? 'bg-indigo-300' : 'bg-slate-200'}`} />
              </div>
              {/* Label below */}
              <span className={[
                'text-[10px] font-medium mt-1.5 text-center leading-tight px-0.5',
                state === 'done'    ? 'text-indigo-600' : '',
                state === 'active'  ? 'text-indigo-700 font-semibold' : '',
                state === 'pending' ? 'text-slate-400' : '',
              ].join(' ')}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── FULL: vertical stepper (for TaskDetail) ── */
  return (
    <div className="space-y-1">
      {steps.map((step, idx) => {
        const state  = getStepState(step.key, status, order);
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2',
                state === 'done'    ? 'bg-emerald-500 border-emerald-500' : '',
                state === 'active'  ? 'bg-white dark:bg-slate-900 border-indigo-500' : '',
                state === 'pending' ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600' : '',
              ].join(' ')}>
                {state === 'done'    && <Check className="w-3 h-3 text-white" />}
                {state === 'active'  && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                {state === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-300" />}
              </div>
              {!isLast && <div className={`w-0.5 h-6 mt-0.5 ${state === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
            </div>
            <div className="pb-5 min-w-0">
              <p className={[
                'text-sm font-medium leading-tight',
                state === 'done'    ? 'text-emerald-700' : '',
                state === 'active'  ? 'text-indigo-700' : '',
                state === 'pending' ? 'text-slate-400' : '',
              ].join(' ')}>
                {step.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

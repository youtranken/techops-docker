'use client';

import { Bold, Italic, Underline, List, ListOrdered, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRichEditor, TOOLBAR_CMDS } from './useRichEditor';

const ICONS = { bold: Bold, italic: Italic, underline: Underline, insertUnorderedList: List, insertOrderedList: ListOrdered, insertHorizontalRule: Minus } as const;

interface RichTextareaProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
}

export function RichTextarea({ value, onChange, placeholder, hasError, className }: RichTextareaProps) {
  const { editorRef, focused, setFocused, activeFormats, updateActiveFormats, handleInput, execCmd } = useRichEditor(value, onChange);
  const isEmpty = !value || value === '<br>' || value === '';

  return (
    <div className={cn(
      'flex flex-col rounded-lg border overflow-hidden transition-all duration-200',
      focused ? 'border-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]'
              : hasError ? 'border-red-400' : 'border-slate-200 dark:border-slate-600',
      className,
    )}>
      {/* Toolbar */}
      <div className={cn(
        'flex items-center gap-0.5 px-2 py-1.5 border-b transition-colors duration-200',
        focused ? 'border-indigo-100 dark:border-indigo-800/40 bg-indigo-50/40 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50',
      )}>
        {TOOLBAR_CMDS.map(({ cmd, title }) => {
          const Icon = ICONS[cmd];
          return (
            <button key={cmd} type="button" title={title}
              onMouseDown={(e) => { e.preventDefault(); execCmd(cmd); }}
              className={cn('w-7 h-7 flex items-center justify-center rounded transition-all duration-150',
                activeFormats.has(cmd) ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>

      {/* Editable area */}
      <div className="relative flex-1 min-h-0">
        {isEmpty && placeholder && (
          <span className="absolute top-3 left-3 text-sm text-slate-400 pointer-events-none select-none leading-relaxed">
            {placeholder}
          </span>
        )}
        <div ref={editorRef} contentEditable suppressContentEditableWarning
          onInput={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          className="w-full h-full min-h-[120px] px-3 py-3 text-sm text-slate-800 dark:text-slate-200 outline-none overflow-y-auto
            [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5
            [&_li]:my-0.5 [&_hr]:my-2 [&_hr]:border-slate-300
            [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline"
        />
      </div>
    </div>
  );
}

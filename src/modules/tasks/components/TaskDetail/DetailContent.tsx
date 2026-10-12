'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLLAPSED_PX = 288; // = max-h-72

/** Nội dung task: thu gọn ~288px, nếu dài hơn thì có nút "Xem toàn bộ" bung ra (cuộn trong khung). */
export function DetailContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight > COLLAPSED_PX + 4);
    setExpanded(false);
  }, [html]);

  return (
    <div>
      <div
        ref={ref}
        className={cn(
          'text-sm text-slate-600 dark:text-slate-400 leading-relaxed pr-1',
          '[&_b]:font-semibold [&_strong]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline',
          '[&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-1',
          '[&_li]:my-0.5 [&_p]:mb-1',
          expanded ? 'max-h-[45vh] overflow-y-auto' : 'max-h-72 overflow-hidden',
          overflowing && !expanded && '[mask-image:linear-gradient(to_bottom,#000_75%,transparent)]',
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" />Thu gọn</>
            : <><ChevronDown className="w-3.5 h-3.5" />Xem toàn bộ</>}
        </button>
      )}
    </div>
  );
}

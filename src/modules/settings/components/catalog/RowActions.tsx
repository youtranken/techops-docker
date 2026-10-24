/** Cụm nút cuối dòng bảng (preview `.rowact`): dồn phải, sát nhau; không mở dòng khi bấm. */
import * as React from 'react';

export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

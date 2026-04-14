'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

type FormatCommand = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'insertHorizontalRule';

export const TOOLBAR_CMDS: {
  cmd: FormatCommand;
  title: string;
}[] = [
  { cmd: 'bold',                title: 'Đậm (Ctrl+B)' },
  { cmd: 'italic',              title: 'Nghiêng (Ctrl+I)' },
  { cmd: 'underline',           title: 'Gạch chân (Ctrl+U)' },
  { cmd: 'insertUnorderedList', title: 'Danh sách không thứ tự' },
  { cmd: 'insertOrderedList',   title: 'Danh sách có thứ tự' },
  { cmd: 'insertHorizontalRule',title: 'Đường kẻ ngang' },
];

export function useRichEditor(value: string, onChange: (html: string) => void) {
  const editorRef        = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [focused,       setFocused]       = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  useEffect(() => {
    const el = editorRef.current;
    if (!el || isInternalChange.current) return;
    if (el.innerHTML !== value) el.innerHTML = value ?? '';
  }, [value]);

  const updateActiveFormats = useCallback(() => {
    const active = new Set<string>();
    if (document.queryCommandState('bold'))      active.add('bold');
    if (document.queryCommandState('italic'))    active.add('italic');
    if (document.queryCommandState('underline')) active.add('underline');
    setActiveFormats(active);
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    isInternalChange.current = true;
    onChange(el.innerHTML);
    requestAnimationFrame(() => { isInternalChange.current = false; });
  }, [onChange]);

  const execCmd = useCallback((cmd: FormatCommand) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
    handleInput();
    updateActiveFormats();
  }, [handleInput, updateActiveFormats]);

  return {
    editorRef,
    focused, setFocused,
    activeFormats,
    updateActiveFormats,
    handleInput,
    execCmd,
  };
}

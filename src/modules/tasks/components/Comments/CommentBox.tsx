'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useCreateComment } from '../../hooks/useComments';

interface Props {
  taskId: string;
}

export function CommentBox({ taskId }: Props) {
  const [content, setContent] = useState('');
  const createComment = useCreateComment();

  function handleSubmit() {
    const trimmed = content.trim();
    if (!trimmed) return;
    createComment.mutate(
      { taskId, content: trimmed },
      { onSuccess: () => setContent('') },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Viết bình luận... (Ctrl+Enter để gửi)"
        rows={3}
        className="text-sm resize-none"
        disabled={createComment.isPending}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={createComment.isPending || !content.trim()}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Gửi
        </Button>
      </div>
    </div>
  );
}

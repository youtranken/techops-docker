import { requireAuth } from '@/lib/auth-utils';
import { NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { TaskDetailLoader } from '@/modules/tasks/components/TaskDetail/TaskDetailLoader';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: Props) {
  const user = await requireAuth();
  if (user instanceof NextResponse) notFound();

  const { id } = await params;
  return <TaskDetailLoader id={id} />;
}

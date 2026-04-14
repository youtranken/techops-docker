import { z } from 'zod';

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    content: z.string().min(1).optional(),
    priorityId: z.string().cuid().optional(),
    typeId: z.string().cuid().optional(),
    scheduleStart: z.string().min(1).optional(),
    scheduleEnd: z.string().min(1).optional(),
    assigneeIds: z.array(z.string().cuid()).min(1).optional(),
    isForceMode: z.boolean().optional(),
    workflowMode: z.enum(['IMMEDIATE', 'NEED_APPROVAL']).optional(),
    attachmentsToAdd: z.array(z.object({
      fileName: z.string(),
      filePath: z.string(),
      fileSize: z.number(),
    })).optional(),
    attachmentsToRemove: z.array(z.string()).optional(),
  })
  .refine(
    (d) => {
      if (d.scheduleStart && d.scheduleEnd) {
        return new Date(d.scheduleEnd) >= new Date(d.scheduleStart);
      }
      return true;
    },
    { message: 'Deadline phải từ ngày bắt đầu trở đi', path: ['scheduleEnd'] }
  );

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

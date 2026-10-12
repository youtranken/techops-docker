import { z } from 'zod';

export const createTaskSchema = z
  .object({
    title:        z.string().min(1, 'Tiêu đề không được trống').max(150, 'Tiêu đề tối đa 150 ký tự'),
    content:      z.string().min(1, 'Nội dung không được trống').max(5000, 'Nội dung tối đa 5000 ký tự'),
    priorityId:   z.string().min(1, 'Vui lòng chọn mức ưu tiên'),   
    typeId:       z.string().min(1, 'Vui lòng chọn loại công việc'),
    scheduleStart: z.string().min(1, 'Ngày bắt đầu không hợp lệ'),
    scheduleEnd:   z.string().min(1, 'Vui lòng chọn ngày hoàn thành'),
    workflowMode: z.enum(['IMMEDIATE', 'NEED_APPROVAL']),
    assigneeIds:  z.array(z.string().cuid()).min(1, 'Phải chọn ít nhất 1 người thực hiện'),
    isForceMode:  z.boolean(),
  })
  .refine(
    (d) => !d.scheduleEnd || !d.scheduleStart || new Date(d.scheduleEnd) >= new Date(d.scheduleStart),
    { message: 'Ngày hoàn thành phải từ ngày bắt đầu trở đi', path: ['scheduleEnd'] },
  );

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateTaskOutput = z.output<typeof createTaskSchema>;

// Attachments are handled outside the form schema (uploaded before submit)
export type CreateTaskAttachment = { fileName: string; filePath: string; fileSize: number };

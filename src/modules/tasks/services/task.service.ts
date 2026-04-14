import { createTask } from './task-create.service';
import { updateTask } from './task-update.service';
import { deleteTask, cancelTask } from './task-delete.service';

export const taskService = {
  create: createTask,
  update: updateTask,
  delete: deleteTask,
  cancel: cancelTask,
};

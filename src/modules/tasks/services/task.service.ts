import { createTask } from './task-create.service';
import { updateTask } from './task-update.service';

export const taskService = {
  create: createTask,
  update: updateTask,
};

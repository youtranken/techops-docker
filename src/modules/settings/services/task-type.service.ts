import { prisma } from '@/lib/prisma';

export const taskTypeService = {
  async list() {
    return prisma.taskType.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { tasks: true } } },
    });
  },

  async create(data: { name: string; icon?: string; description?: string; color?: string }) {
    return prisma.taskType.create({ data });
  },

  async update(id: string, data: Partial<{ name: string; color: string; icon: string; description: string }>) {
    return prisma.taskType.update({ where: { id }, data });
  },

  async delete(id: string) {
    const used = await prisma.task.count({ where: { typeId: id, isDeleted: false } });
    if (used > 0) throw new Error('TASK_TYPE_IN_USE');
    return prisma.taskType.delete({ where: { id } });
  },
};

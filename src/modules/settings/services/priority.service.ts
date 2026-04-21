import { prisma } from '@/lib/prisma';

export const priorityService = {
  async list() {
    return prisma.priority.findMany({
      orderBy: { level: 'desc' },
      include: { _count: { select: { tasks: true } } },
    });
  },

  async create(data: { name: string; color: string; level: number; isDefault?: boolean }) {
    if (data.isDefault) {
      // Clear existing default
      await prisma.priority.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    return prisma.priority.create({ data });
  },

  async update(id: string, data: Partial<{ name: string; color: string; level: number; isDefault: boolean }>) {
    if (data.isDefault) {
      await prisma.priority.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }
    return prisma.priority.update({ where: { id }, data });
  },

  async delete(id: string) {
    const used = await prisma.task.count({ where: { priorityId: id } });
    if (used > 0) throw new Error('PRIORITY_IN_USE');
    return prisma.priority.delete({ where: { id } });
  },
};

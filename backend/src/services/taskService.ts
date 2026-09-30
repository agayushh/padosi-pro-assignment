import type { Category, Task } from "@prisma/client";
import prisma from "../config/prismaInstance.js";
import { AppError } from "../utils/AppError.js";
import { HTTP_STATUS } from "../utils/httpStatus.js";

type TaskView = {
  id: number;
  name: string;
  description: string;
};

export type CategoryView = {
  id: number;
  name: string;
  description: string;
  tasks: TaskView[];
};

function toTask(task: Task): TaskView {
  return { id: task.id, name: task.name, description: task.description };
}

export async function listCatalogue(query: string): Promise<CategoryView[]> {
  const q = query.trim();
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      tasks: {
        where: q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { category: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : undefined,
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return categories
    .filter((category) => category.tasks.length > 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      tasks: category.tasks.map(toTask),
    }));
}

type SelectedTask = Task & { category: Category };

function groupSelected(tasks: SelectedTask[]): CategoryView[] {
  const groups = new Map<number, CategoryView>();
  for (const task of tasks) {
    const existing = groups.get(task.categoryId);
    const view = toTask(task);
    if (existing) {
      existing.tasks.push(view);
      continue;
    }
    groups.set(task.categoryId, {
      id: task.category.id,
      name: task.category.name,
      description: task.category.description,
      tasks: [view],
    });
  }
  return [...groups.values()];
}

export async function listSelected(userId: number) {
  const rows = await prisma.userTask.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { task: { include: { category: true } } },
  });
  const tasks = rows.map((row) => row.task);
  return {
    tasks: tasks.map((task) => ({
      ...toTask(task),
      categoryName: task.category.name,
    })),
    categories: groupSelected(tasks),
  };
}

export async function replaceSelection(userId: number, taskIds: number[]) {
  const found = await prisma.task.findMany({ where: { id: { in: taskIds } } });
  if (found.length !== taskIds.length) {
    throw new AppError(
      HTTP_STATUS.BAD_REQUEST,
      "UNKNOWN_TASK",
      "One or more tasks are not in the catalogue.",
    );
  }

  await prisma.$transaction([
    prisma.userTask.deleteMany({ where: { userId } }),
    prisma.userTask.createMany({
      data: taskIds.map((taskId) => ({ userId, taskId })),
    }),
  ]);

  return listSelected(userId);
}

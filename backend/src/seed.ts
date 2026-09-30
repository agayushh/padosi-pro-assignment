import "dotenv/config";
import prisma from "./config/prismaInstance.js";
import { catalogue } from "./data/catalogue.js";

async function main() {
  let tasks = 0;
  for (const [categoryIndex, category] of catalogue.entries()) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        sortOrder: categoryIndex,
      },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: categoryIndex,
      },
    });

    for (const [taskIndex, task] of category.tasks.entries()) {
      await prisma.task.upsert({
        where: { slug: task.slug },
        create: {
          slug: task.slug,
          name: task.name,
          description: task.description,
          categoryId: saved.id,
          sortOrder: taskIndex,
        },
        update: {
          name: task.name,
          description: task.description,
          categoryId: saved.id,
          sortOrder: taskIndex,
        },
      });
      tasks += 1;
    }
  }

  console.log(`Seeded ${catalogue.length} categories and ${tasks} tasks.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

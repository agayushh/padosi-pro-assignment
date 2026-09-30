import prisma from "../config/prismaInstance.js";
import { toPublicUser, type PublicUser } from "./publicUser.js";

export async function loadPublicUser(userId: number): Promise<PublicUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { tasks: true } } },
  });
  if (!user) return null;
  return toPublicUser(user, user._count.tasks);
}

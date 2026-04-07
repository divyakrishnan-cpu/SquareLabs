import { db as prisma } from "@/lib/db";

/**
 * Creates an in-app notification for a user.
 * Shared utility used by design-ops API routes.
 */
export async function createNotification(
  userId: string,
  requestId: string,
  title: string,
  body: string
) {
  return (prisma as any).notification.create({
    data: { id: crypto.randomUUID(), userId, requestId, title, body },
  });
}

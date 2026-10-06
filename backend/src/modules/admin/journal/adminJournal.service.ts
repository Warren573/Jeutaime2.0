import { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { writeAudit } from "../admin.audit";

export async function listCommunityPosts() {
  return prisma.communityJournalPost.findMany({
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
}

export async function createCommunityPost(
  actorId: string,
  title: string,
  body: string,
) {
  const post = await prisma.communityJournalPost.create({
    data: {
      title,
      body,
      createdBy: actorId,
    },
  });

  await writeAudit({
    actorId,
    action: "admin.journal.community.publish",
    target: post.id,
    meta: { title } as Prisma.InputJsonValue,
  });

  return post;
}


export async function updateCommunityPost(
  actorId: string,
  id: string,
  title: string,
  body: string,
) {
  const post = await prisma.communityJournalPost.update({
    where: { id },
    data: { title, body },
  });

  await writeAudit({
    actorId,
    action: "admin.journal.community.update",
    target: post.id,
    meta: { title } as Prisma.InputJsonValue,
  });

  return post;
}

export async function deleteCommunityPost(actorId: string, id: string) {
  const post = await prisma.communityJournalPost.delete({
    where: { id },
  });

  await writeAudit({
    actorId,
    action: "admin.journal.community.delete",
    target: post.id,
    meta: { title: post.title } as Prisma.InputJsonValue,
  });

  return { success: true };
}

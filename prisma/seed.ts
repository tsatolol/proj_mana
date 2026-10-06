// Run via `pnpm db:seed` (prisma db seed), which loads env files through
// prisma.config.ts and passes them to this process.
import { db } from "../src/lib/db";

async function main() {
  // Organization settings is a singleton row (id = 1).
  await db.orgSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  const admin = await db.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", name: "管理者", role: "ADMIN" },
  });
  const member = await db.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: { email: "member@example.com", name: "メンバー", role: "MEMBER" },
  });

  const existing = await db.project.findFirst({ where: { name: "サンプルプロジェクト" } });
  if (existing) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  await db.project.create({
    data: {
      name: "サンプルプロジェクト",
      description: "シードデータで作成したプロジェクトです。",
      createdById: admin.id,
      tasks: {
        create: [
          { title: "要件を整理する", status: "DONE", position: 1000, createdById: admin.id, assigneeId: admin.id },
          { title: "画面を設計する", status: "IN_PROGRESS", position: 1000, createdById: admin.id, assigneeId: member.id },
          { title: "実装する", status: "TODO", position: 1000, createdById: member.id },
          { title: "レビューする", status: "TODO", position: 2000, createdById: member.id },
        ],
      },
    },
  });

  console.log("Seed data created.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

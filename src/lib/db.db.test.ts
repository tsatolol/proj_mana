import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "@/test/db";

import { db } from "./db";

beforeEach(async () => {
  await resetDatabase(db);
});

afterAll(async () => {
  await db.$disconnect();
});

describe("database schema", () => {
  it("creates a project with a task and a subtask", async () => {
    const user = await db.user.create({ data: { email: "alice@example.com" } });
    const project = await db.project.create({
      data: { name: "案件A", createdById: user.id },
    });
    const parent = await db.task.create({
      data: { projectId: project.id, title: "親タスク", position: 1000, createdById: user.id },
    });
    await db.task.create({
      data: {
        projectId: project.id,
        parentId: parent.id,
        title: "サブタスク",
        position: 1000,
        createdById: user.id,
      },
    });

    const loaded = await db.task.findUniqueOrThrow({
      where: { id: parent.id },
      include: { subtasks: true },
    });
    expect(user.role).toBe("MEMBER");
    expect(project.status).toBe("ACTIVE");
    expect(loaded.status).toBe("TODO");
    expect(loaded.subtasks.map((t) => t.title)).toEqual(["サブタスク"]);
  });

  it("deletes tasks together with their project", async () => {
    const user = await db.user.create({ data: { email: "bob@example.com" } });
    const project = await db.project.create({
      data: {
        name: "案件B",
        createdById: user.id,
        tasks: { create: [{ title: "タスク", position: 1000, createdById: user.id }] },
      },
    });

    await db.project.delete({ where: { id: project.id } });

    expect(await db.task.count()).toBe(0);
  });

  it("stores start and due dates as calendar dates", async () => {
    const user = await db.user.create({ data: { email: "carol@example.com" } });
    const project = await db.project.create({ data: { name: "案件C", createdById: user.id } });
    const task = await db.task.create({
      data: {
        projectId: project.id,
        title: "日付",
        position: 1000,
        createdById: user.id,
        startDate: new Date("2026-04-01T23:30:00Z"),
      },
    });

    // The time part is dropped by the DATE column.
    expect(task.startDate?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});

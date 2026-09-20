// 工作台仓储层:Prisma 实现(生成记录 / 积分账本 / 案例提示词)
import { prisma } from "@/server/lib/prisma";
import type { GenerationRef, StudioRepo } from "@/server/services/studio-service";

export const prismaStudioRepo: StudioRepo = {
  async findCasePromptById(caseId) {
    const row = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, title: true, prompt: true },
    });
    return row ?? null;
  },
  async createGeneration(data) {
    const row = await prisma.generation.create({ data });
    return { ...row, createdAt: row.createdAt };
  },
  async updateGenerationResult(id, data) {
    await prisma.generation.update({ where: { id }, data });
  },
  async listGenerationsByUser(userId, limit) {
    return prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
  async consumeCredits(userId, amount) {
    const r = await prisma.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    });
    return r.count > 0;
  },
  async addCredits(userId, delta) {
    const row = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: delta } },
      select: { credits: true },
    });
    return row.credits;
  },
  async createCreditLog(userId, delta, reason, balanceAfter) {
    await prisma.creditLog.create({ data: { userId, delta, reason, balanceAfter } });
  },
  async listCreditLogs(userId, limit) {
    return prisma.creditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
  },
  async getBalance(userId) {
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    return row?.credits ?? 0;
  },
};

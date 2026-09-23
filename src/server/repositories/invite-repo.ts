// 邀请码仓储层:Prisma 实现
import { prisma } from "@/server/lib/prisma";

export interface InviteRow {
  id: string;
  code: string; // 归一化完整串
  prefix: string;
  payload: string;
  note: string;
  maxUses: number;
  usedCount: number;
  expiresAt: Date;
  status: string;
  createdAt: Date;
}

export const inviteRepo = {
  async createInvite(data: {
    code: string;
    prefix: string;
    payload: string;
    createdBy: string;
    maxUses: number;
    expiresAt: Date;
    note: string;
  }): Promise<InviteRow> {
    return prisma.inviteCode.create({ data: { ...data, status: "active" } });
  },
  async listInvites(): Promise<InviteRow[]> {
    return prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" } });
  },
  async setInviteStatus(id: string, status: string): Promise<boolean> {
    const r = await prisma.inviteCode.updateMany({ where: { id }, data: { status } });
    return r.count > 0;
  },
};

// 认证仓储层：Prisma 实现
import { prisma } from "@/server/lib/prisma";
import type { AuthRepo, UserRef, UserStatus, UserRole } from "@/server/services/auth-service";

const toRef = (u: {
  id: string;
  email: string;
  nickname: string | null;
  passwordHash: string;
  status: string;
  role: string;
  credits: number;
  inviteCodeId: string | null;
  createdAt: Date;
}): UserRef => ({ ...u });

export const prismaAuthRepo: AuthRepo = {
  async findUserByEmail(email) {
    const row = await prisma.user.findUnique({ where: { email } });
    return row ? toRef(row) : null;
  },
  async findUserById(userId) {
    const row = await prisma.user.findUnique({ where: { id: userId } });
    return row ? toRef(row) : null;
  },
  async createUser(email, passwordHash, status: UserStatus, role: UserRole, inviteCodeId?: string | null) {
    return toRef(
      await prisma.user.create({ data: { email, passwordHash, status, role, inviteCodeId: inviteCodeId ?? null } }),
    );
  },
  async setUserStatus(userId, status) {
    await prisma.user.update({ where: { id: userId }, data: { status } });
  },
  async updatePasswordHash(userId, passwordHash) {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },
  async listUsersByStatus(status?: UserStatus) {
    const rows = await prisma.user.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRef);
  },
  async createRefreshToken(userId, tokenHash, expiresAt) {
    await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  },
  async findRefreshToken(tokenHash) {
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!row) return null;
    return { userId: row.userId, expiresAt: row.expiresAt.getTime(), revoked: row.revoked };
  },
  async revokeRefreshToken(tokenHash) {
    await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
  },
  async revokeUserRefreshTokens(userId) {
    await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
  },
  async createCreditLog(userId, delta, reason, balanceAfter) {
    await prisma.creditLog.create({ data: { userId, delta, reason, balanceAfter } });
  },
  async consumeInvite(normalizedCode, now) {
    const inv = await prisma.inviteCode.findUnique({ where: { code: normalizedCode } });
    if (!inv) return null;
    const r = await prisma.inviteCode.updateMany({
      where: {
        id: inv.id,
        status: "active",
        usedCount: { lt: inv.maxUses },
        expiresAt: { gt: now },
      },
      data: { usedCount: { increment: 1 } },
    });
    return r.count > 0 ? inv.id : null;
  },
  async refundInvite(normalizedCode) {
    await prisma.inviteCode.updateMany({
      where: { code: normalizedCode, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  },
};

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
  async createUser(email, passwordHash, status: UserStatus, role: UserRole) {
    return toRef(await prisma.user.create({ data: { email, passwordHash, status, role } }));
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
};

// 用户管理服务（超管）：列表 / 审核 / 重置密码
// 与 auth-service 同构：仓储注入，便于单测
import { hashPassword } from "@/server/lib/password";
import { AuthError, type AuthRepo, type UserRef, type UserStatus } from "@/server/services/auth-service";

/** 审核用户：目标不存在抛 USER_NOT_FOUND */
export async function setUserStatus(
  repo: AuthRepo,
  userId: string,
  status: Exclude<UserStatus, "pending">,
): Promise<UserRef> {
  const user = await repo.findUserById(userId);
  if (!user) throw new AuthError("USER_NOT_FOUND", "用户不存在");
  await repo.setUserStatus(userId, status);
  return { ...user, status };
}

/** 超管重置用户密码（无自助找回通道前的人工替代） */
export async function resetPassword(repo: AuthRepo, userId: string, newPassword: string): Promise<void> {
  const user = await repo.findUserById(userId);
  if (!user) throw new AuthError("USER_NOT_FOUND", "用户不存在");
  await repo.updatePasswordHash(userId, await hashPassword(newPassword));
  // 重置后吊销该用户全部会话，强制用新密码重新登录
  await repo.revokeUserRefreshTokens(userId);
}

export async function listUsers(repo: AuthRepo, status?: UserStatus): Promise<UserRef[]> {
  return repo.listUsersByStatus(status);
}

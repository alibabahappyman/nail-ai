import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE_NAME } from './auth';
import { sql } from './db';
import type { User } from './types';

// 服务端专用：从 cookie 读 JWT → 查 users 表 → 返回当前用户（未登录返回 null）。
// 返回的 User 不含 password_hash。
export async function getCurrentUser(): Promise<User | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await verifySession(token);
    if (!session) return null;

    const rows = await sql`
      SELECT id, email, name, avatar, bio, created_at
      FROM users
      WHERE id = ${session.userId}
    `;
    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatar: row.avatar || '',
      bio: row.bio || '',
      designs: [],
      favorites: [],
      communityPosts: [],
      following: [],
      followers: 0,
    };
  } catch (err) {
    console.error('[session] getCurrentUser 失败:', err);
    return null;
  }
}

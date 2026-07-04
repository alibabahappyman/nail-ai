import { sql } from '@/lib/db';
import { mapRowToPost } from '@/lib/posts';
import type { CommunityPost } from '@/lib/types';

// 拉取当前登录用户收藏的帖子列表。用于 profile 页统计与展示。
export async function getFavoritedPosts(userId: string): Promise<CommunityPost[]> {
  const rows = await sql`
    SELECT p.*, u.name AS author_name, u.avatar AS author_avatar
    FROM favorites f
    JOIN posts p ON p.id = f.post_id
    JOIN users u ON u.id = p.author_id
    WHERE f.user_id = ${userId}
    ORDER BY f.created_at DESC
  `;
  return Promise.all(rows.map((r: any) => mapRowToPost(r, userId)));
}

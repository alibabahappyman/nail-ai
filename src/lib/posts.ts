import { sql } from '@/lib/db';
import type { CommunityPost, Comment } from '@/lib/types';

// 把联表查询的原始行映射为 CommunityPost（含作者信息、图片、点赞数、评论、当前用户视角布尔位）。
// viewerId 用来计算 liked / favorited / isOwn；为 null 表示未登录访客。
export async function mapRowToPost(row: any, viewerId: string | null): Promise<CommunityPost> {
  const [images, likesCount, comments] = await Promise.all([
    sql`SELECT url FROM post_images WHERE post_id = ${row.id} ORDER BY position ASC`,
    sql`SELECT COUNT(*)::int AS cnt FROM likes WHERE post_id = ${row.id}`,
    sql`
      SELECT c.id, c.author_id, c.content, c.created_at, u.name AS author_name, u.avatar AS author_avatar
      FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.post_id = ${row.id}
      ORDER BY c.created_at ASC
    `,
  ]);

  let liked = false;
  let favorited = false;
  if (viewerId) {
    const [l, f] = await Promise.all([
      sql`SELECT 1 FROM likes WHERE user_id = ${viewerId} AND post_id = ${row.id}`,
      sql`SELECT 1 FROM favorites WHERE user_id = ${viewerId} AND post_id = ${row.id}`,
    ]);
    liked = l.length > 0;
    favorited = f.length > 0;
  }

  const mappedComments: Comment[] = comments.map((c: any) => ({
    id: c.id,
    authorId: c.author_id,
    authorName: c.author_name,
    authorAvatar: c.author_avatar || '',
    content: c.content,
    createdAt: c.created_at,
    likes: 0,
    parentId: c.parent_id || null,
  }));

  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorAvatar: row.author_avatar || '',
    images: images.map((i: any) => i.url),
    title: row.title,
    description: row.description || '',
    tags: row.tags || [],
    likes: likesCount[0]?.cnt || 0,
    liked,
    favorited,
    isOwn: viewerId ? row.author_id === viewerId : false,
    comments: mappedComments,
    createdAt: row.created_at,
    category: row.category || undefined,
  };
}

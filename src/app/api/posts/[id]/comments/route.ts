import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

// GET 评论列表
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`
    SELECT c.id, c.author_id, c.content, c.created_at, c.parent_id, u.name AS author_name, u.avatar AS author_avatar
    FROM comments c JOIN users u ON u.id = c.author_id
    WHERE c.post_id = ${id}
    ORDER BY c.created_at ASC
  `;
  const comments = rows.map((c: any) => ({
    id: c.id,
    authorId: c.author_id,
    authorName: c.author_name,
    authorAvatar: c.author_avatar || '',
    content: c.content,
    createdAt: c.created_at,
    likes: 0,
    parentId: c.parent_id || null,
  }));
  return NextResponse.json({ comments });
}

// POST 新评论（可选 parentId 表示回复某条评论）
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

  const { content, parentId } = await req.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 });
  }

  // 若指定 parentId，校验该评论存在且属于同一帖子，防止跨帖回复
  let resolvedParent: string | null = null;
  if (parentId) {
    const found = await sql`
      SELECT id FROM comments WHERE id = ${parentId} AND post_id = ${id}
    `;
    if (found.length > 0) resolvedParent = parentId;
  }

  const inserted = await sql`
    INSERT INTO comments (post_id, author_id, content, parent_id)
    VALUES (${id}, ${user.id}, ${content.trim()}, ${resolvedParent})
    RETURNING id, created_at
  `;
  const c = inserted[0];
  return NextResponse.json({
    comment: {
      id: c.id,
      authorId: user.id,
      authorName: user.name,
      authorAvatar: user.avatar,
      content: content.trim(),
      createdAt: c.created_at,
      likes: 0,
      parentId: resolvedParent,
    },
  });
}

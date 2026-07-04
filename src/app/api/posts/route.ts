import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { mapRowToPost } from '@/lib/posts';

export const runtime = 'nodejs';

// GET /api/posts?category=xxx&author=me&page=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const author = searchParams.get('author'); // 'me' 表示当前用户
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const limit = 30;
  const offset = (page - 1) * limit;

  const viewer = await getCurrentUser();
  const viewerId = viewer?.id ?? null;

  let rows: any[];
  if (author === 'me') {
    if (!viewerId) return NextResponse.json({ posts: [] });
    rows = await sql`
      SELECT p.*, u.name AS author_name, u.avatar AS author_avatar
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.author_id = ${viewerId}
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else if (category && category !== '全部') {
    rows = await sql`
      SELECT p.*, u.name AS author_name, u.avatar AS author_avatar
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.category = ${category} OR ${category} = ANY(p.tags)
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  } else {
    rows = await sql`
      SELECT p.*, u.name AS author_name, u.avatar AS author_avatar
      FROM posts p JOIN users u ON u.id = p.author_id
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
  }

  const posts = await Promise.all(rows.map((r: any) => mapRowToPost(r, viewerId)));
  return NextResponse.json({ posts });
}

// POST /api/posts  创建帖子
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const { title, description, tags, images, category } = await req.json();
    if (!title || !title.trim()) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '至少上传一张图片' }, { status: 400 });
    }

    const inserted = await sql`
      INSERT INTO posts (author_id, title, description, category, tags)
      VALUES (${user.id}, ${title.trim()}, ${description || ''}, ${category || null}, ${tags || []})
      RETURNING *
    `;
    const post = inserted[0];

    // 插入图片
    await Promise.all(
      images.map((url: string, i: number) =>
        sql`INSERT INTO post_images (post_id, url, position) VALUES (${post.id}, ${url}, ${i})`
      )
    );

    const row = await sql`
      SELECT p.*, u.name AS author_name, u.avatar AS author_avatar
      FROM posts p JOIN users u ON u.id = p.author_id
      WHERE p.id = ${post.id}
    `;
    const fullPost = await mapRowToPost(row[0], user.id);
    return NextResponse.json({ post: fullPost });
  } catch (err) {
    console.error('[posts/create]', err);
    return NextResponse.json({ error: '发布失败' }, { status: 500 });
  }
}

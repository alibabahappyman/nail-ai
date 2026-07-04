import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export const runtime = 'nodejs';

// PUT /api/auth/profile  更新当前用户的资料（昵称、头像、个性签名）
// avatar 可以是 emoji 字符，也可以是 Vercel Blob 图片 URL。
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const { name, avatar, bio } = await req.json();

    // 昵称必填、限长
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return NextResponse.json({ error: '昵称不能为空' }, { status: 400 });
    }
    if (trimmedName.length > 30) {
      return NextResponse.json({ error: '昵称不能超过 30 个字' }, { status: 400 });
    }

    // 头像：emoji 或 URL，限长
    const avatarVal = typeof avatar === 'string' ? avatar.trim().slice(0, 500) : '';
    // 个性签名：限长 200
    const bioVal = typeof bio === 'string' ? bio.trim().slice(0, 200) : '';

    await sql`
      UPDATE users
      SET name = ${trimmedName}, avatar = ${avatarVal || null}, bio = ${bioVal}
      WHERE id = ${user.id}
    `;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: trimmedName,
        avatar: avatarVal,
        bio: bioVal,
      },
    });
  } catch (err) {
    console.error('[auth/profile]', err);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

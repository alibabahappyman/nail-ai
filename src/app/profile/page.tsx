'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import type { CommunityPost } from '@/lib/types';

type ModalKind = 'designs' | 'posts' | 'favorites' | null;

interface AuthUser {
  id: string;
  name: string;
  avatar: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { designs } = useStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [favPosts, setFavPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(async (d) => {
        if (!d.user) { setLoading(false); return; }
        setUser(d.user);
        const [mine, favs] = await Promise.all([
          fetch('/api/posts?author=me', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/favorites', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        setMyPosts(mine.posts || []);
        setFavPosts(favs.posts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 未登录引导
  if (!loading && !user) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--ink)' }}>登录后查看个人主页</h1>
        <p className="mb-6" style={{ color: 'var(--ink-muted)' }}>登录后可查看你发布的帖子和收藏的灵感</p>
        <Link href="/login"><button className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--accent-gold), #b8942e)', color: '#0a0a0f', border: 'none' }}>去登录</button></Link>
      </div>
    );
  }

  // 个人设计方案藏品仍用本地数据（NailDesign 暂未迁库）
  const favDesigns = designs.filter((d) => d.id);

  const stats = [
    { label: '设计方案藏品', value: favDesigns.length, modal: 'designs' as ModalKind },
    { label: '发布帖子', value: myPosts.length, modal: 'posts' as ModalKind },
    { label: '收藏帖子', value: favPosts.length, modal: 'favorites' as ModalKind },
    { label: '获赞总数', value: myPosts.reduce((s, p) => s + p.likes, 0), modal: null as ModalKind },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {loading ? (
        <p className="text-center py-20" style={{ color: 'var(--ink-muted)' }}>加载中...</p>
      ) : (
        <>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent-gold), #6b2fa0)', padding: '3px' }}>
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-3xl" style={{ background: 'var(--bg-card)', color: 'var(--accent-gold)' }}>{user!.avatar || '✦'}</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--ink)' }}>{user!.name}</h1>
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>在暗夜中寻找美的碎片</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map((stat, i) => (
              <GlassCard
                key={i}
                className={`text-center ${stat.modal ? 'cursor-pointer hover:scale-[1.03] transition-all' : ''}`}
                onClick={stat.modal ? () => setModal(stat.modal) : undefined}
              >
                <p className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>{stat.value}</p>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{stat.label}</p>
              </GlassCard>
            ))}
          </div>

          {/* 我发布的帖子 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--ink)' }}>我发布的灵感 ({myPosts.length})</h2>
            {myPosts.length > 0 ? (
              <div className="grid grid-cols-5 gap-3">
                {myPosts.map((post) => (
                  <Link key={post.id} href="/community">
                    <div className="rounded-xl overflow-hidden border aspect-[3/4] transition-all hover:scale-105" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                      <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12">
                <p className="mb-4" style={{ color: 'var(--ink-muted)' }}>还没有发布过灵感</p>
                <Link href="/community"><button className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--accent-gold), #b8942e)', color: '#0a0a0f', border: 'none' }}>去灵感社区发布</button></Link>
              </GlassCard>
            )}
          </div>

          {/* 我收藏的帖子 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--ink)' }}>收藏的灵感 ({favPosts.length})</h2>
            {favPosts.length > 0 ? (
              <div className="grid grid-cols-5 gap-3">
                {favPosts.map((post) => (
                  <Link key={post.id} href="/community">
                    <div className="rounded-xl overflow-hidden border aspect-[3/4] transition-all hover:scale-105" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                      <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12">
                <p style={{ color: 'var(--ink-muted)' }}>还没有收藏过灵感，去社区逛逛吧</p>
              </GlassCard>
            )}
          </div>

          {/* 设计方案藏品（本地数据） */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--ink)' }}>设计方案藏品 ({favDesigns.length})</h2>
            {favDesigns.length > 0 ? (
              <div className="grid grid-cols-5 gap-3">
                {favDesigns.map((design) => (
                  <Link key={design.id} href={`/design/${design.id}`}>
                    <div className="rounded-xl overflow-hidden border aspect-[3/4] transition-all hover:scale-105" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                      <img src={design.nails[0]?.image || '/nail_1.jpg'} alt={design.name} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-12">
                <p className="mb-4" style={{ color: 'var(--ink-muted)' }}>还没有设计方案藏品，去设计工坊创建你的第一个痛甲吧</p>
                <Link href="/design"><button className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--accent-gold), #b8942e)', color: '#0a0a0f', border: 'none' }}>前往设计工坊</button></Link>
              </GlassCard>
            )}
          </div>
        </>
      )}

      {/* ═══ 统计详情弹窗 ═══ */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setModal(null)}
        >
          <GlassCard
            className="max-w-4xl w-full max-h-[85vh] overflow-y-auto"
            style={{ animation: 'fade-in-up 0.3s ease-out' }}
            onClick={(e) => e?.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                {modal === 'designs' && `设计方案藏品 (${favDesigns.length})`}
                {modal === 'posts' && `我发布的灵感 (${myPosts.length})`}
                {modal === 'favorites' && `收藏的灵感 (${favPosts.length})`}
              </h2>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: 'var(--bg-surface)', color: 'var(--ink-muted)' }}
                onClick={() => setModal(null)}
              >x</button>
            </div>

            {/* 设计方案藏品 */}
            {modal === 'designs' && (
              favDesigns.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {favDesigns.map((design) => (
                    <Link key={design.id} href={`/design/${design.id}`} onClick={() => setModal(null)}>
                      <div className="rounded-xl overflow-hidden border transition-all hover:scale-105" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                        <img src={design.nails[0]?.image || '/nail_1.jpg'} alt={design.name} className="w-full aspect-[3/4] object-cover" />
                        <div className="p-2">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{design.name}</p>
                          <p className="text-[10px]" style={{ color: 'var(--accent-gold)' }}>{design.compatibilityScore}分</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center py-12" style={{ color: 'var(--ink-muted)' }}>还没有设计方案藏品</p>
              )
            )}

            {/* 我发布的帖子 */}
            {modal === 'posts' && (
              myPosts.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {myPosts.map((post) => (
                    <Link key={post.id} href="/community" onClick={() => setModal(null)}>
                      <div className="rounded-xl overflow-hidden border transition-all hover:scale-105" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                        <img src={post.images[0]} alt={post.title} className="w-full aspect-[3/4] object-cover" />
                        <div className="p-2">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{post.title}</p>
                          <p className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>赞 {post.likes} · {formatDate(post.createdAt)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center py-12" style={{ color: 'var(--ink-muted)' }}>还没有发布过灵感</p>
              )
            )}

            {/* 收藏的帖子 */}
            {modal === 'favorites' && (
              favPosts.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {favPosts.map((post) => (
                    <Link key={post.id} href="/community" onClick={() => setModal(null)}>
                      <div className="rounded-xl overflow-hidden border transition-all hover:scale-105" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                        <img src={post.images[0]} alt={post.title} className="w-full aspect-[3/4] object-cover" />
                        <div className="p-2">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{post.title}</p>
                          <p className="text-[10px]" style={{ color: 'var(--ink-muted)' }}>by {post.authorName}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center py-12" style={{ color: 'var(--ink-muted)' }}>还没有收藏过灵感</p>
              )
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

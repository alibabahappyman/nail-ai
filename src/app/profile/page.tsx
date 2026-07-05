'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';
import type { CommunityPost } from '@/lib/types';

type ModalKind = 'designs' | 'posts' | 'favorites' | null;

interface AuthUser {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
}

const AVATAR_EMOJIS = ['✦', '🌙', '🌸', '◆', '☽', '🖤', '💄', '💅', '👑', '🦋', '🌹', '⚡', '🔥', '💎', '👽', '🤍'];

interface AuthUser {
  id: string;
  name: string;
  avatar: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { designs, removeDesign } = useStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([]);
  const [favPosts, setFavPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);

  // 编辑资料弹窗
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const openEdit = () => {
    if (!user) return;
    setEditName(user.name);
    setEditAvatar(user.avatar || '');
    setEditBio(user.bio || '');
    setEditError('');
    setEditing(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setEditError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      setEditAvatar(data.url);
    } catch (err: any) {
      setEditError(err.message || '头像上传失败');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) { setEditError('昵称不能为空'); return; }
    setSaving(true);
    setEditError('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, avatar: editAvatar, bio: editBio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setUser(data.user);
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setEditError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

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
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center text-3xl" style={{ background: 'var(--bg-card)', color: 'var(--accent-gold)' }}>
                {user!.avatar && user!.avatar.startsWith('http')
                  ? <img src={user!.avatar} alt={user!.name} className="w-full h-full object-cover" />
                  : (user!.avatar || '✦')}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{user!.name}</h1>
                <button
                  onClick={openEdit}
                  className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-all"
                  style={{ background: 'rgba(212,168,83,0.1)', color: 'var(--accent-gold)', border: '1px solid var(--border)' }}
                >编辑资料</button>
              </div>
              <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                {user!.bio || '在暗夜中寻找美的碎片'}
              </p>
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
                      <img src={design.nailSetImage || design.nails[0]?.image || '/nail_1.jpg'} alt={design.name} className="w-full h-full object-cover" />
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
                    <div key={design.id} className="relative group">
                      <Link href={`/design/${design.id}`} onClick={() => setModal(null)}>
                        <div className="rounded-xl overflow-hidden border transition-all hover:scale-105" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                          <img src={design.nailSetImage || design.nails[0]?.image || '/nail_1.jpg'} alt={design.name} className="w-full aspect-[3/4] object-cover" />
                          <div className="p-2">
                            <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{design.name}</p>
                            <p className="text-[10px]" style={{ color: 'var(--accent-gold)' }}>{design.compatibilityScore}分</p>
                          </div>
                        </div>
                      </Link>
                      <button
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#e94560' }}
                        title="删除该设计方案"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm('确定删除这个设计方案吗？删除后无法恢复。')) {
                            removeDesign(design.id);
                          }
                        }}
                      >×</button>
                    </div>
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

      {/* ═══ 编辑资料弹窗 ═══ */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setEditing(false)}
        >
          <GlassCard
            className="max-w-lg w-full"
            style={{ animation: 'fade-in-up 0.3s ease-out' }}
            onClick={(e) => e?.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>编辑资料</h2>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                style={{ background: 'var(--bg-surface)', color: 'var(--ink-muted)' }}
                onClick={() => setEditing(false)}
              >x</button>
            </div>

            {/* 头像 */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--ink-muted)' }}>头像</label>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'var(--bg-surface)', color: 'var(--accent-gold)' }}>
                  {editAvatar && editAvatar.startsWith('http')
                    ? <img src={editAvatar} alt="头像" className="w-full h-full object-cover" />
                    : (editAvatar || '✦')}
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                  style={{ background: 'var(--bg-surface)', color: 'var(--ink-secondary)', border: '1px solid var(--border)' }}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                >{avatarUploading ? '上传中...' : '上传图片'}</button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--ink-muted)' }}>或从 emoji 选择：</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg cursor-pointer transition-all"
                    style={{
                      background: editAvatar === emoji ? 'rgba(212,168,83,0.2)' : 'var(--bg-surface)',
                      border: `1px solid ${editAvatar === emoji ? 'var(--accent-gold)' : 'var(--border)'}`,
                    }}
                    onClick={() => setEditAvatar(emoji)}
                  >{emoji}</button>
                ))}
              </div>
            </div>

            {/* 昵称 */}
            <div className="mb-5">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--ink-muted)' }}>昵称</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={30}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none input-glow"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                placeholder="你想被怎么称呼"
              />
            </div>

            {/* 个性签名 */}
            <div className="mb-6">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--ink-muted)' }}>个性签名</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none input-glow resize-none"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                placeholder="一句话介绍自己..."
              />
              <p className="text-xs text-right mt-1" style={{ color: 'var(--ink-muted)' }}>{editBio.length}/200</p>
            </div>

            {editError && <p className="text-sm mb-4" style={{ color: '#e94560' }}>{editError}</p>}

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setEditing(false)}>取消</Button>
              <Button variant="gold" onClick={handleSaveProfile} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

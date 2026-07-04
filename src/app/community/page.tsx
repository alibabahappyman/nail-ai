'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Tag from '@/components/Tag';
import SectionTitle from '@/components/SectionTitle';
import { generateId, formatDate } from '@/lib/utils';
import type { CommunityPost, Comment } from '@/lib/types';

const CATEGORIES = ['全部', '动漫IP', '表情包', '专辑主题', '渐变', '手绘', '哥特'];

interface AuthUser {
  id: string;
  name: string;
  avatar: string;
}

export default function CommunityPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);   // 当前回复的评论 id
  const [replyText, setReplyText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 拉取当前登录用户
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { setUser(d.user || null); setUserLoading(false); })
      .catch(() => setUserLoading(false));
  }, []);

  // 拉取帖子列表
  const loadPosts = useCallback(async (category: string) => {
    setPostsLoading(true);
    try {
      const qs = category && category !== '全部' ? `?category=${encodeURIComponent(category)}` : '';
      const res = await fetch(`/api/posts${qs}`, { cache: 'no-store' });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(activeCategory);
  }, [activeCategory, loadPosts]);

  // 点赞（乐观更新）
  const handleLike = async (postId: string) => {
    if (!user) { router.push('/login'); return; }
    const target = posts.find((p) => p.id === postId) || (selectedPost?.id === postId ? selectedPost : null);
    if (!target) return;
    const wasLiked = target.liked;
    const apply = (p: CommunityPost) => p.id === postId
      ? { ...p, liked: !wasLiked, likes: p.likes + (wasLiked ? -1 : 1) }
      : p;
    setPosts((prev) => prev.map(apply));
    if (selectedPost?.id === postId) setSelectedPost(apply(selectedPost));

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: wasLiked ? 'DELETE' : 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error();
      const sync = (p: CommunityPost) => p.id === postId ? { ...p, liked: data.liked, likes: data.likes } : p;
      setPosts((prev) => prev.map(sync));
      if (selectedPost?.id === postId) setSelectedPost(sync(selectedPost));
    } catch {
      const rollback = (p: CommunityPost) => p.id === postId
        ? { ...p, liked: wasLiked, likes: target.likes }
        : p;
      setPosts((prev) => prev.map(rollback));
      if (selectedPost?.id === postId) setSelectedPost(rollback(selectedPost));
    }
  };

  // 收藏（乐观更新）
  const handleFavorite = async (postId: string) => {
    if (!user) { router.push('/login'); return; }
    const target = posts.find((p) => p.id === postId) || (selectedPost?.id === postId ? selectedPost : null);
    if (!target) return;
    const wasFav = target.favorited;
    const apply = (p: CommunityPost) => p.id === postId ? { ...p, favorited: !wasFav } : p;
    setPosts((prev) => prev.map(apply));
    if (selectedPost?.id === postId) setSelectedPost(apply(selectedPost));

    try {
      const res = await fetch(`/api/posts/${postId}/favorite`, { method: wasFav ? 'DELETE' : 'POST' });
      if (!res.ok) throw new Error();
    } catch {
      const rollback = (p: CommunityPost) => p.id === postId ? { ...p, favorited: wasFav } : p;
      setPosts((prev) => prev.map(rollback));
      if (selectedPost?.id === postId) setSelectedPost(rollback(selectedPost));
    }
  };

  // 评论（replyTo 为 null 表示对帖子直接评论；否则为回复某条评论的 id）
  const handleComment = async (replyTo: string | null = null) => {
    if (!selectedPost) return;
    const text = (replyTo ? replyText : commentText).trim();
    if (!text) return;
    if (!user) { router.push('/login'); return; }
    const c: Comment = {
      id: generateId(), authorId: user.id, authorName: user.name, authorAvatar: user.avatar,
      content: text, createdAt: new Date().toISOString(), likes: 0,
      parentId: replyTo,
    };
    const applyAppend = (p: CommunityPost): CommunityPost => ({ ...p, comments: [...p.comments, c] });
    setSelectedPost((prev) => prev ? applyAppend(prev) : prev);
    if (replyTo) setReplyText(''); else setCommentText('');
    setReplyTo(null);

    try {
      const res = await fetch(`/api/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, parentId: replyTo }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const sync = (p: CommunityPost) => p.id === selectedPost.id
        ? { ...p, comments: [...p.comments.filter((x) => x.id !== c.id), data.comment] }
        : p;
      setSelectedPost((prev) => prev ? sync(prev) : prev);
      setPosts((prev) => prev.map(sync));
    } catch {
      const rollback = (p: CommunityPost) => ({ ...p, comments: p.comments.filter((x) => x.id !== c.id) });
      setSelectedPost((prev) => prev ? rollback(prev) : prev);
    }
  };

  // 图片上传（先传 Blob 拿 url，再随帖子一起提交）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      setNewImage(data.url);
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 发布帖子
  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newImage) return;
    if (!user) { router.push('/login'); return; }
    setPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle, description: newDesc, tags: newTags,
          images: [newImage], category: newTags[0] || '全部',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发布失败');
      setPosts((prev) => [data.post, ...prev]);
      setShowCreateModal(false);
      setNewTitle(''); setNewDesc(''); setNewTags([]); setNewImage(null);
    } catch (err: any) {
      setError(err.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const openCreate = () => {
    if (!user) { router.push('/login'); return; }
    setShowCreateModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-10 py-8">
      <SectionTitle>灵感社区</SectionTitle>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <Tag key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>{cat}</Tag>
        ))}
      </div>

      {postsLoading ? (
        <p className="text-center py-20" style={{ color: 'var(--ink-muted)' }}>加载中...</p>
      ) : posts.length === 0 ? (
        <p className="text-center py-20" style={{ color: 'var(--ink-muted)' }}>
          还没有灵感，{user ? '点击右下角按钮发布第一条吧' : '登录后发布第一条吧'}
        </p>
      ) : (
        <div className="columns-3 gap-4">
          {posts.map((post) => (
            <GlassCard key={post.id} className="mb-4 break-inside-avoid cursor-pointer" onClick={() => setSelectedPost(post)}>
              <div className="rounded-lg overflow-hidden mb-3" style={{ background: 'var(--bg-surface)' }}>
                <img src={post.images[0]} alt={post.title} className="w-full object-cover" style={{ aspectRatio: '3/4' }} />
              </div>
              <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--ink)' }}>{post.title}</h3>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-surface)', color: 'var(--accent-gold)', fontSize: '10px' }}>
                  {post.authorAvatar && post.authorAvatar.startsWith('http')
                    ? <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                    : (post.authorAvatar || '✦')}
                </div>
                <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{post.authorName}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {post.tags.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ink-muted)' }}>{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {post.favorited && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent-gold)" stroke="var(--accent-gold)" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                  )}
                  <div className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={post.liked ? 'var(--accent-gold)' : 'none'} stroke="var(--ink-muted)" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                    <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{post.likes}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* FAB */}
      <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer hover:scale-110" style={{ background: 'linear-gradient(135deg, var(--accent-gold), #b8942e)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.4)', zIndex: 50 }} onClick={openCreate}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0f" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>

      {/* Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedPost(null)}>
          <GlassCard className="max-w-2xl w-full max-h-[85vh] overflow-y-auto" style={{ animation: 'fade-in-up 0.3s ease-out' }} onClick={(e) => e?.stopPropagation()}>
            <div className="flex justify-end mb-2"><button className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'var(--bg-surface)', color: 'var(--ink-muted)' }} onClick={() => setSelectedPost(null)}>x</button></div>
            <div className="rounded-xl overflow-hidden mb-4" style={{ background: 'var(--bg-surface)' }}>
              {selectedPost.images.map((img, i) => (
                <img key={i} src={img} alt={selectedPost.title} className="w-full object-cover" style={{ maxHeight: '400px' }} />
              ))}
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--ink)' }}>{selectedPost.title}</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-surface)', color: 'var(--accent-gold)' }}>
                {selectedPost.authorAvatar && selectedPost.authorAvatar.startsWith('http')
                  ? <img src={selectedPost.authorAvatar} alt={selectedPost.authorName} className="w-full h-full object-cover" />
                  : (selectedPost.authorAvatar || '✦')}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{selectedPost.authorName}</p>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{formatDate(selectedPost.createdAt)}</p>
              </div>
            </div>
            <div className="flex gap-2 mb-3">{selectedPost.tags.map((tag: string) => (<Tag key={tag} size="sm">{tag}</Tag>))}</div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ink-secondary)' }}>{selectedPost.description}</p>

            <div className="flex gap-3 mb-6">
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all" style={{ borderColor: selectedPost.liked ? 'var(--accent-gold)' : 'var(--border)', background: selectedPost.liked ? 'rgba(212, 168, 83, 0.1)' : 'transparent' }} onClick={() => handleLike(selectedPost.id)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={selectedPost.liked ? 'var(--accent-gold)' : 'none'} stroke={selectedPost.liked ? 'var(--accent-gold)' : 'var(--ink-muted)'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                <span className="text-sm" style={{ color: selectedPost.liked ? 'var(--accent-gold)' : 'var(--ink-muted)' }}>{selectedPost.liked ? '已点赞' : '点赞'} ({selectedPost.likes})</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-all" style={{ borderColor: selectedPost.favorited ? 'var(--accent-gold)' : 'var(--border)', background: selectedPost.favorited ? 'rgba(212, 168, 83, 0.1)' : 'transparent' }} onClick={() => handleFavorite(selectedPost.id)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={selectedPost.favorited ? 'var(--accent-gold)' : 'none'} stroke={selectedPost.favorited ? 'var(--accent-gold)' : 'var(--ink-muted)'} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                <span className="text-sm" style={{ color: selectedPost.favorited ? 'var(--accent-gold)' : 'var(--ink-muted)' }}>{selectedPost.favorited ? '已收藏' : '收藏'}</span>
              </button>
            </div>

            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--ink)' }}>评论区 ({selectedPost.comments.length})</h3>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {selectedPost.comments.length === 0 && <p className="text-sm text-center py-4" style={{ color: 'var(--ink-muted)' }}>暂无评论，快来抢沙发吧</p>}
                {/* 顶层评论：parentId 为空 */}
                {selectedPost.comments
                  .filter((c) => !c.parentId)
                  .map((comment) => {
                    // 该评论的回复
                    const replies = selectedPost.comments.filter((r) => r.parentId === comment.id);
                    return (
                      <div key={comment.id} className="p-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold" style={{ color: 'var(--accent-gold)' }}>{comment.authorName}</span>
                          <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>{comment.content}</p>
                        <button
                          className="text-xs mt-1 cursor-pointer"
                          style={{ color: 'var(--ink-muted)' }}
                          onClick={() => { setReplyTo(comment.id); setReplyText(''); }}
                        >回复</button>

                        {/* 回复输入框 */}
                        {replyTo === comment.id && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="text"
                              autoFocus
                              placeholder={`回复 @${comment.authorName}...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleComment(comment.id); if (e.key === 'Escape') setReplyTo(null); }}
                              className="flex-1 px-3 py-1.5 rounded-lg border text-xs outline-none"
                              style={{ background: 'var(--bg-void)', borderColor: 'var(--border)', color: 'var(--ink)' }}
                            />
                            <button className="text-xs px-2 cursor-pointer" style={{ color: 'var(--ink-muted)' }} onClick={() => setReplyTo(null)}>取消</button>
                            <Button variant="gold" size="sm" onClick={() => handleComment(comment.id)}>回复</Button>
                          </div>
                        )}

                        {/* 嵌套回复列表 */}
                        {replies.length > 0 && (
                          <div className="mt-2 ml-4 space-y-2 border-l-2 pl-3" style={{ borderColor: 'var(--border)' }}>
                            {replies.map((r) => (
                              <div key={r.id} className="py-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-xs font-bold" style={{ color: 'var(--accent-gold)' }}>{r.authorName}</span>
                                  <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{formatDate(r.createdAt)}</span>
                                </div>
                                <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>{r.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder={user ? '发表评论...' : '登录后评论'} value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment()} className="flex-1 px-4 py-2 rounded-lg border text-sm outline-none" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }} />
                <Button variant="gold" size="sm" onClick={() => handleComment()}>发送</Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setShowCreateModal(false)}>
          <GlassCard className="max-w-lg w-full" style={{ animation: 'fade-in-up 0.3s ease-out' }} onClick={(e) => e?.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6" style={{ color: 'var(--ink)' }}>发布新灵感</h2>
            <div className="mb-4"><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--ink-muted)' }}>标题</label><input type="text" placeholder="为你的灵感命名..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }} /></div>
            <div className="mb-4"><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--ink-muted)' }}>描述</label><textarea placeholder="分享你的设计灵感和故事..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none resize-none" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }} /></div>
            <div className="mb-4"><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--ink-muted)' }}>标签</label><div className="flex flex-wrap gap-2">{CATEGORIES.filter((c) => c !== '全部').map((cat) => (<Tag key={cat} active={newTags.includes(cat)} onClick={() => { setNewTags(newTags.includes(cat) ? newTags.filter((t) => t !== cat) : [...newTags, cat]); }} size="sm">{cat}</Tag>))}</div></div>
            <div className="mb-6">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--ink-muted)' }}>图片上传</label>
              {newImage ? (
                <div className="relative inline-block">
                  <img src={newImage} alt="预览" className="w-48 h-48 rounded-lg object-cover" />
                  <button className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--ink)' }} onClick={() => setNewImage(null)}>x</button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer" style={{ borderColor: 'var(--border)' }} onClick={() => fileInputRef.current?.click()}>
                  <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>{uploading ? '上传中...' : '点击上传图片'}</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>
            {error && <p className="text-sm mb-4" style={{ color: '#e94560' }}>{error}</p>}
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button variant="gold" onClick={handleCreatePost} disabled={!newTitle.trim() || !newImage || publishing}>
                {publishing ? '发布中...' : '发布'}
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

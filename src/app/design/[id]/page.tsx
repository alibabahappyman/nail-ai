'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import { useStore } from '@/lib/store';
import { DIFFICULTY_STARS, DIFFICULTY_LABELS } from '@/lib/utils';
import type { NailDesign } from '@/lib/types';

export default function DesignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { designs, toggleFavorite, currentUser, rateDesign } = useStore();
  const [design, setDesign] = useState<NailDesign | null>(null);

  useEffect(() => {
    const id = params.id as string;
    const found = designs.find((d) => d.id === id);
    setDesign(found || null);
  }, [params.id, designs]);

  if (!design) {
    return (
      <div className="min-h-screen flex items-center justify-center">
          <GlassCard className="text-center max-w-md">
            <p className="text-lg mb-4" style={{ color: 'var(--ink-muted)' }}>找不到该设计方案</p>
            <Button variant="gold" onClick={() => router.push('/design')}>返回设计工坊</Button>
          </GlassCard>
        </div>
      );
  }

  const isFaved = currentUser.favorites.includes(design.id);
  const rating = design.rating ?? 0;
  const tryOnSrc = design.tryOnImage || design.nailSetImage || '';
  const nailSetSrc = design.nailSetImage || design.nails?.[0]?.image || '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-6">
          {/* Left Column 48% */}
          <div style={{ width: '48%' }}>
            <GlassCard className="mb-4">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-gold)' }}>试戴预览</h3>
              <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-surface)', aspectRatio: '4/5' }}>
                {tryOnSrc ? (
                  <img src={tryOnSrc} alt="试戴预览" className="w-full h-full object-contain" />
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>暂无试戴图</p>
                )}
              </div>
            </GlassCard>

            <GlassCard className="mb-4">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-gold)' }}>AI 提示词</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-secondary)' }}>{design.prompt}</p>
            </GlassCard>

            <GlassCard className="mb-4">
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-gold)' }}>施工难度</h3>
              <div className="flex items-center gap-3">
                <span className="text-xl" style={{ color: 'var(--accent-gold)' }}>{DIFFICULTY_STARS[design.difficulty - 1]}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{DIFFICULTY_LABELS[design.difficulty - 1]}</span>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--accent-gold)' }}>材料清单</h3>
              <ul className="space-y-2">
                {design.materials.map((mat, i) => (
                  <li key={i} className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ background: 'var(--bg-surface)' }}>
                    <span className="text-sm" style={{ color: 'var(--ink)' }}>{mat.name}</span>
                    <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{mat.quantity}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>

          {/* Right Column 52% */}
          <div style={{ width: '52%' }}>
            <GlassCard className="mb-4">
              <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--accent-gold)' }}>我的评分</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>0–5 星表示你对生成效果的满意度，点击星星打分</p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className="text-4xl leading-none cursor-pointer transition-transform hover:scale-110"
                      style={{ color: n <= rating ? 'var(--accent-gold)' : 'var(--border)', background: 'none', border: 'none' }}
                      onClick={() => rateDesign(design.id, n === rating ? 0 : n)}
                      title={`${n} 星`}
                    >★</button>
                  ))}
                </div>
                <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>{rating} / 5</span>
              </div>
            </GlassCard>

            <GlassCard className="mb-4">
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--accent-gold)' }}>五指设计</h3>
              <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-surface)' }}>
                {nailSetSrc ? (
                  <img src={nailSetSrc} alt="五指设计" className="w-full object-contain" />
                ) : (
                  <p className="text-xs py-12" style={{ color: 'var(--ink-muted)' }}>暂无甲片图</p>
                )}
              </div>
            </GlassCard>

            <div className="flex gap-3">
              <Button variant={isFaved ? 'secondary' : 'gold'} onClick={() => toggleFavorite(design.id)}>{isFaved ? '已收藏' : '保存到藏品'}</Button>
              <Button variant="secondary" onClick={() => router.push('/design')}>重新编辑</Button>
              <Button variant="glass">分享</Button>
            </div>
          </div>
        </div>
      </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import { useStore } from '@/lib/store';

export default function ComparePage() {
  const { designs } = useStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { if (next.size >= 3) return prev; next.add(id); }
      return next;
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ink)' }}>设计对比</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-muted)' }}>选择最多3个设计方案进行对比（点击选中/取消）</p>

        {designs.length === 0 ? (
          <GlassCard className="text-center py-16">
            <p className="text-lg mb-4" style={{ color: 'var(--ink-muted)' }}>暂无设计方案可供对比</p>
            <Link href="/design"><button className="px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--accent-gold), #b8942e)', color: '#0a0a0f', border: 'none' }}>前往设计工坊</button></Link>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {designs.slice(0, 3).map((design, index) => (
              <GlassCard key={design.id} className="cursor-pointer transition-all relative" style={{ borderColor: selectedIds.has(design.id) ? 'var(--accent-gold)' : 'var(--border)', boxShadow: selectedIds.has(design.id) ? '0 0 30px rgba(212, 168, 83, 0.3)' : '0 4px 24px rgba(0,0,0,0.3)' }} onClick={() => toggleSelect(design.id)}>
                {selectedIds.has(design.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>{[...selectedIds].indexOf(design.id) + 1}</div>
                )}
                <div className="rounded-xl overflow-hidden mb-4" style={{ background: 'var(--bg-surface)' }}>
                  <img src={design.nailSetImage || design.nails[0]?.image || '/nail_1.jpg'} alt={design.name} className="w-full object-cover" style={{ aspectRatio: '4/5' }} />
                </div>
                <h3 className="font-bold mb-3" style={{ color: 'var(--ink)' }}>{design.name}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>综合评分</p>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>{design.compatibilityScore}</span>
                      <span className="text-sm font-bold mb-1" style={{ color: 'var(--ink-secondary)' }}>{design.compatibilityScore >= 95 ? 'A+' : design.compatibilityScore >= 90 ? 'A' : design.compatibilityScore >= 85 ? 'B+' : 'B'}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>难度 <span style={{ color: 'var(--ink)' }}>{design.difficulty}/5</span></p>
                    <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>工艺 <span style={{ color: 'var(--ink)' }}>{design.techniques.length}项</span></p>
                  </div>
                </div>
              </GlassCard>
            ))}
            {designs.length < 3 && Array.from({ length: 3 - designs.length }).map((_, i) => (
              <div key={`empty-${i}`} className="border-2 border-dashed rounded-xl flex items-center justify-center" style={{ borderColor: 'var(--border)', minHeight: '300px' }}>
                <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>等待更多设计</p>
              </div>
            ))}
          </div>
        )}

        {designs.length > 3 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--ink-secondary)' }}>全部设计（点击选中参与对比）</h2>
            <div className="grid grid-cols-4 gap-3">
              {designs.map((design) => (
                <div key={design.id} className="rounded-xl overflow-hidden border cursor-pointer transition-all hover:scale-105" style={{ borderColor: selectedIds.has(design.id) ? 'var(--accent-gold)' : 'var(--border)', boxShadow: selectedIds.has(design.id) ? '0 0 20px rgba(212, 168, 83, 0.2)' : 'none' }} onClick={() => toggleSelect(design.id)}>
                  <img src={design.nailSetImage || design.nails[0]?.image || '/nail_1.jpg'} alt={design.name} className="w-full aspect-[3/4] object-cover" />
                  <div className="p-2">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>{design.name}</p>
                    <p className="text-xs" style={{ color: 'var(--accent-gold)' }}>{design.compatibilityScore}分</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}

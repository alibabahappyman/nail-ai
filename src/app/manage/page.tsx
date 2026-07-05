'use client';

import React from 'react';
import Link from 'next/link';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Tag from '@/components/Tag';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';

export default function ManagePage() {
  const { designs, removeDesign } = useStore();

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>设计管理</h1>
          <Link href="/design"><Button variant="gold" size="sm">+ 新建设计</Button></Link>
        </div>
        {designs.length === 0 ? (
          <GlassCard className="text-center py-16">
            <p className="text-lg mb-4" style={{ color: 'var(--ink-muted)' }}>暂无设计方案</p>
            <Link href="/design"><Button variant="gold">创建你的第一个设计</Button></Link>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {designs.map((design) => (
              <GlassCard key={design.id} className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-surface)' }}>
                  <img src={design.nailSetImage || design.nails[0]?.image || '/nail_1.jpg'} alt={design.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/design/${design.id}`}><h3 className="font-bold text-base mb-1 cursor-pointer hover:underline" style={{ color: 'var(--ink)' }}>{design.name}</h3></Link>
                  <p className="text-xs mb-2" style={{ color: 'var(--ink-muted)' }}>{formatDate(design.createdAt)}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {design.styleTags.map((tag: string) => (<Tag key={tag} size="sm">{tag}</Tag>))}
                    {design.techniques.slice(0, 2).map((tag: string) => (<Tag key={tag} size="sm">{tag}</Tag>))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/design/${design.id}`}><Button variant="secondary" size="sm">查看</Button></Link>
                  <Button variant="glass" size="sm" onClick={() => removeDesign(design.id)} style={{ color: '#e53e3e' }}>删除</Button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
  );
}

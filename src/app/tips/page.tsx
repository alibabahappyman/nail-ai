'use client';

import React, { useRef } from 'react';
import GlassCard from '@/components/GlassCard';
import SectionTitle from '@/components/SectionTitle';
import { useStore, type HandPhotoRecord } from '@/lib/store';
import { generateId } from '@/lib/utils';

export default function TipsPage() {
  const { handPhotos, addHandPhoto, removeHandPhoto } = useStore();
  const handInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      addHandPhoto({
        id: generateId(),
        image: reader.result as string,
        takenAt: new Date().toISOString(),
      } as HandPhotoRecord);
    };
    reader.readAsDataURL(file);
    // 清空 input，方便重复上传同一文件
    e.target.value = '';
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderHandArchive = () => {
    const accent = 'var(--accent-gold)';
    const accentSoft = 'rgba(201,168,76,0.12)';
    return (
      <div className="rounded-xl p-4" style={{ border: `1px solid var(--border)`, background: 'var(--bg-surface)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
            <h3 className="text-base font-bold" style={{ color: 'var(--ink)' }}>手部照片</h3>
            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>{handPhotos.length} 张</span>
          </div>
          <button
            className="px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all hover:scale-105"
            style={{ background: 'transparent', color: accent, border: `1px solid ${accent}` }}
            onClick={() => handInputRef.current?.click()}
          >+ 拍/传一张</button>
          <input ref={handInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUpload} />
        </div>
        {handPhotos.length === 0 ? (
          <button
            className="w-full py-8 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
            style={{ border: `2px dashed ${accent}`, background: accentSoft }}
            onClick={() => handInputRef.current?.click()}
          >
            <p className="text-2xl mb-1" style={{ color: accent }}>✦</p>
            <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>还没有手部照片，点击上传一张</p>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {handPhotos.map((p) => (
              <div key={p.id} className="relative group rounded-lg overflow-hidden transition-all hover:scale-[1.03]" style={{ boxShadow: '0 0 0 0 transparent' }}>
                <img src={p.image} alt="手部照片" className="w-full aspect-square object-cover" />
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: 'var(--ink)' }}>
                  {formatDate(p.takenAt)}
                </div>
                <button
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#e94560' }}
                  onClick={() => removeHandPhoto(p.id)}
                >×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const knowledgeCards = [
    {
      title: '二次元美甲施工技巧',
      icon: '🎨',
      content: [
        '使用极细画笔（000号）绘制精细线条',
        '先在纸上练习图案，熟练后再上甲',
        '利用贴纸辅助定位，再用颜料补色',
        '多层薄涂比单层厚涂效果更精致',
        '最后封层前确保颜料完全干燥',
      ],
    },
    {
      title: '甲油胶配色法则',
      icon: '💡',
      content: [
        '同色系渐变：选择2-3个同色系甲油胶',
        '互补色撞色：如粉+绿、紫+黄，大胆搭配',
        '金属色点缀：金色/银色能提升整体质感',
        '透明层叠加：创造玻璃般的通透感',
        '注意甲床底色对配色的实际影响',
      ],
    },
    {
      title: '持久度提升秘诀',
      icon: '💪',
      content: [
        '打磨甲面后再涂建构胶，增加附着力',
        '包边是关键！每层都要仔细包裹指甲前端',
        '封层不要太厚，薄而均匀更持久',
        '避免热水浸泡，戴手套做家务',
        '每2-3周补一次封层，延长寿命',
      ],
    },
    {
      title: '手型与甲型搭配',
      icon: '✌️',
      content: [
        '手指修长：适合任何甲型，尝试尖形或杏仁形',
        '手指粗短：选择方圆形或椭圆形，视觉拉长',
        '指甲床窄：方形甲能增加甲面宽度感',
        '指甲床宽：杏仁形收窄指尖，更显优雅',
        '甲面不平：建构胶塑形后选择任意甲型',
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">

        {/* 手部照片档案 */}
        <section className="mb-12">
          <SectionTitle subtitle="维护你的手部照片，设计时直接选用">
            我的手部档案
          </SectionTitle>
          <GlassCard>
            <p className="text-xs mb-5" style={{ color: 'var(--ink-muted)' }}>
              设计痛甲时会从这里选用一张手部照片做虚拟试戴，无需每次重传。可保留不同时间拍的照片。
            </p>
            {renderHandArchive()}
          </GlassCard>
        </section>

        {/* 分隔装饰 */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="h-px w-20" style={{ background: 'linear-gradient(90deg, transparent, var(--border-gold))' }} />
          <span style={{ color: 'var(--accent-gold)', fontSize: '10px' }}>◆</span>
          <div className="h-px w-20" style={{ background: 'linear-gradient(90deg, var(--border-gold), transparent)' }} />
        </div>

        {/* Tool Guide - Left Image Right Text */}
        <section className="mb-12">
          <SectionTitle subtitle="认识你的美甲工具箱">
            工具图鉴
          </SectionTitle>
          <GlassCard className="flex gap-8 items-center">
            <div
              className="w-80 flex-shrink-0 rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
              style={{ background: 'var(--bg-surface)', boxShadow: '0 0 24px rgba(201,168,76,0.10)' }}
            >
              <img
                src="/nail_tools.jpg"
                alt="美甲工具图鉴"
                className="w-full object-cover"
                style={{ aspectRatio: '4/3' }}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--accent-gold)' }}>
                专业美甲工具一览
              </h3>
              <div className="space-y-1.5">
                {[
                  { name: '甲油胶', desc: '色彩丰富、持久度高，需UV灯照干' },
                  { name: '建构胶', desc: '增强甲面硬度，可塑形、加固' },
                  { name: '封层', desc: '最后一层保护，增加光泽和持久度' },
                  { name: '手绘颜料', desc: '用于精细图案绘制，需细毛画笔' },
                  { name: '闪粉/贴钻', desc: '装饰性材料，增添闪耀效果' },
                ].map((tool, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2 rounded-lg transition-all"
                    style={{ borderLeft: '2px solid transparent' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(212,168,83,0.06)';
                      e.currentTarget.style.borderLeftColor = 'var(--accent-gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderLeftColor = 'transparent';
                    }}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-semibold"
                      style={{ background: 'rgba(212, 168, 83, 0.15)', color: 'var(--accent-gold)', border: '1px solid rgba(201,168,76,0.3)', boxShadow: '0 0 8px rgba(201,168,76,0.15)' }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{tool.name}</p>
                      <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>{tool.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </section>

        {/* 分隔装饰 */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="h-px w-20" style={{ background: 'linear-gradient(90deg, transparent, var(--border-gold))' }} />
          <span style={{ color: 'var(--accent-gold)', fontSize: '10px' }}>◆</span>
          <div className="h-px w-20" style={{ background: 'linear-gradient(90deg, var(--border-gold), transparent)' }} />
        </div>

        {/* Knowledge Cards - 2x2 Grid */}
        <section className="mb-12">
          <SectionTitle subtitle="从入门到精通，掌握美甲核心知识">
            护甲知识
          </SectionTitle>
          <div className="grid grid-cols-2 gap-6">
            {knowledgeCards.map((card, i) => (
              <GlassCard key={i} className="relative overflow-hidden" style={{ borderLeftWidth: '3px', borderLeftColor: 'var(--accent-gold)' }}>
                {/* 左侧金条发光 */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--accent-gold)', boxShadow: '0 0 12px rgba(201,168,76,0.4)' }} />
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'rgba(212,168,83,0.12)', border: '1px solid rgba(201,168,76,0.3)' }}
                  >{card.icon}</span>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                    {card.title}
                  </h3>
                </div>
                {/* 标题金线 */}
                <div className="w-12 h-[2px] rounded-full mb-3" style={{ background: 'linear-gradient(90deg, var(--accent-gold), transparent)' }} />
                <ul className="space-y-2.5">
                  {card.content.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink-secondary)' }}>
                      <span className="mt-1 flex-shrink-0" style={{ color: 'var(--accent-gold)', fontSize: '8px' }}>◆</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        </section>
      </div>
  );
}

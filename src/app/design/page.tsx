'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Tag from '@/components/Tag';
import { useStore } from '@/lib/store';
import { STYLE_TAGS, TECHNIQUE_TAGS, PALETTE_PRESETS } from '@/lib/mock-data';
import { generateId, buildPrompt } from '@/lib/utils';
import { deriveStyleDNA, deriveDifficulty, deriveMaterials, type DesignMetaInput } from '@/lib/designMeta';

type Mode = 'guided' | 'free';

const FREE_PROMPT_TEMPLATE = `【画面描述】
（描述你想要的痛甲整体效果、主体内容、构图...）

【风格】
（如暗黑摇滚、赛博朋克、日系少女、专辑封面风...）

【细节】
（特殊元素、材质质感、氛围、点缀...）`;

// 通用护甲建议（替换原「手型分析」写死数据）
const NAIL_CARE_TIPS = [
  '上甲前先打磨甲面，增强附着力',
  '包边处理，前端更持久不翘边',
  '封层薄而均匀，避免起皱',
  '做家务戴手套，减少磨损',
];

interface Series {
  id: string;
  serial: number;
  name: string;
  mode: Mode;
  // 引导模式字段
  themeName: string;
  characters: string;
  signatureSymbol: string;
  palette: string[];
  styleTags: string[];
  techniques: string[];
  // 共用
  refImage: string | null;
  // 自由模式字段
  promptText: string;
  // 生成结果
  generated: boolean;
  nailSetImage: string;    // 一整张图：一排 5 个甲片（单手）
}

const MAX_SERIES = 10;

let seriesCounter = 0;
const createSeries = (): Series => {
  seriesCounter += 1;
  return {
    id: generateId(),
    serial: seriesCounter,
    name: `系列${seriesCounter}`,
    mode: 'guided',
    themeName: '',
    characters: '',
    signatureSymbol: '',
    palette: PALETTE_PRESETS[0],
    styleTags: [],
    techniques: [],
    refImage: null,
    promptText: FREE_PROMPT_TEMPLATE,
    generated: false,
    nailSetImage: '',
  };
};

export default function DesignPage() {
  const router = useRouter();
  const { addDesign, handPhotos, selectedHandId, setSelectedHand, addHandPhoto } = useStore();
  const refInputRef = useRef<HTMLInputElement>(null);
  const newHandInputRef = useRef<HTMLInputElement>(null);

  // 手部照片选择弹窗
  const [handPicker, setHandPicker] = useState(false);

  // 系列列表 + 当前激活系列
  const [seriesList, setSeriesList] = useState<Series[]>(() => [createSeries()]);
  const [activeSeriesId, setActiveSeriesId] = useState<string>(() => seriesList[0]?.id ?? '');

  // 正在生成的系列 id（按钮 loading 态）
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // 单手试戴预览
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);
  const [tryOnLoading, setTryOnLoading] = useState(false);

  const activeSeries = seriesList.find((s) => s.id === activeSeriesId) ?? seriesList[0];

  // 当前选用的手部照片
  const handPhoto = handPhotos.find((p) => p.id === selectedHandId) || null;

  // ===== 系列操作 =====
  const addSeries = () => {
    if (seriesList.length >= MAX_SERIES) {
      alert(`最多 ${MAX_SERIES} 个系列，可删除旧的再加新的`);
      return;
    }
    const s = createSeries();
    setSeriesList((prev) => [...prev, s]);
    setActiveSeriesId(s.id);
  };

  const removeSeries = (id: string) => {
    if (seriesList.length <= 1) {
      alert('至少保留 1 个系列');
      return;
    }
    setSeriesList((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (activeSeriesId === id) setActiveSeriesId(next[0].id);
      return next;
    });
  };

  const renameSeries = (id: string, name: string) => {
    setSeriesList((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const setSeriesMode = (id: string, mode: Mode) => {
    setSeriesList((prev) => prev.map((s) => (s.id === id ? { ...s, mode } : s)));
  };

  const updateActive = <K extends keyof Series>(key: K, value: Series[K]) => {
    setSeriesList((prev) => prev.map((s) => (s.id === activeSeriesId ? { ...s, [key]: value } : s)));
  };

  // ===== 文件上传（参考图） =====
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ===== 新拍手部照片：存入档案并自动选中 =====
  const handleNewHandUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const id = generateId();
      addHandPhoto({ id, image: reader.result as string, takenAt: new Date().toISOString() });
      setSelectedHand(id);
      setHandPicker(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleTag = (tag: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  };

  // ===== 单个系列生成（真实调用 Gemini：出一整张 5 指图） =====
  const handleGenerateSeries = async (id: string) => {
    const s = seriesList.find((x) => x.id === id);
    if (!s) return;
    if (generatingId) return;

    const hasContent = s.refImage || (s.mode === 'free' ? s.promptText.trim() : s.themeName.trim());
    if (!hasContent) {
      alert(s.mode === 'free' ? '请先填写效果描述（Prompt）' : '请先填写主题名称，或上传参考图');
      return;
    }

    setGeneratingId(id);
    try {
      const res = await fetch('/api/generate-nail-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: s.mode,
          themeName: s.themeName,
          characters: s.characters,
          signatureSymbol: s.signatureSymbol,
          palette: s.palette,
          styleTags: s.styleTags,
          techniques: s.techniques,
          promptText: s.promptText,
          refImage: s.refImage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.image) {
        alert('生成失败：' + (data.error || '') + (data.detail ? '\n' + data.detail : ''));
        return;
      }
      setSeriesList((prev) => prev.map((x) => (x.id === id ? { ...x, generated: true, nailSetImage: data.image } : x)));
      // 换了甲片图，之前的试戴结果作废
      setTryOnImage(null);
    } catch (err: any) {
      alert('请求出错：' + (err?.message || err) + '\n请确认已在 .env.local 填写 Gemini key 并重启服务。');
    } finally {
      setGeneratingId(null);
    }
  };

  // ===== 单手试戴预览（当前系列甲片 贴到 已选手照） =====
  const handleTryOn = async () => {
    const s = activeSeries;
    if (!s.generated || !s.nailSetImage) {
      alert('请先生成本系列（5指）');
      return;
    }
    if (!handPhoto) {
      alert('请先在左侧选用一张手部照片');
      return;
    }
    setTryOnLoading(true);
    setTryOnImage(null);
    try {
      const res = await fetch('/api/try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handImage: handPhoto.image, nailImage: s.nailSetImage }),
      });
      const data = await res.json();
      if (!res.ok || !data.image) throw new Error(data.error || '试戴失败');
      setTryOnImage(data.image as string);
    } catch (err: any) {
      alert('试戴预览生成失败：' + (err?.message || err));
    } finally {
      setTryOnLoading(false);
    }
  };

  // ===== 保存为「我的定制美甲」 =====
  const handleGenerateFinal = () => {
    const s = activeSeries;
    if (!s.generated || !s.nailSetImage) {
      alert('请先生成本系列（5指）');
      return;
    }
    const metaInput: DesignMetaInput = {
      mode: s.mode,
      themeName: s.themeName,
      characters: s.characters,
      signatureSymbol: s.signatureSymbol,
      palette: s.palette,
      styleTags: s.styleTags,
      techniques: s.techniques,
      promptText: s.promptText,
    };

    const design = {
      id: generateId(),
      name: s.themeName || s.name,
      theme: s.themeName || s.name,
      characters: s.characters,
      signatureSymbol: s.signatureSymbol,
      colorPalette: s.palette,
      styleTags: s.styleTags,
      techniques: s.techniques,
      refImage: s.refImage || undefined,
      handImage: handPhoto?.image || undefined,
      styleDNA: deriveStyleDNA(metaInput),
      nails: [],
      nailSetImage: s.nailSetImage,
      tryOnImage: tryOnImage || undefined,
      rating: 0,
      prompt: s.mode === 'free'
        ? s.promptText
        : buildPrompt({ name: s.themeName || s.name, characters: s.characters, signatureSymbol: s.signatureSymbol, colorPalette: s.palette, styleTags: s.styleTags, techniques: s.techniques }),
      difficulty: deriveDifficulty(metaInput),
      materials: deriveMaterials(metaInput),
      compatibilityScore: 0,
      createdAt: new Date().toISOString(),
      resonanceTheme: 'default',
    };
    addDesign(design);
    router.push('/design/loading');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--ink)' }}>设计工作台</h1>

      {/* ═══ 模式 Tab ═══ */}
      <div className="flex gap-2 mb-4">
        <button
          className="btn-glow px-5 py-2 rounded-lg text-sm font-medium"
          style={activeSeries.mode === 'guided'
            ? { background: 'var(--accent-gold)', color: '#0a0a0f' }
            : { background: 'var(--bg-surface)', color: 'var(--ink-secondary)', border: '1px solid var(--border)' }}
          onClick={() => setSeriesMode(activeSeries.id, 'guided')}
        >
          引导模式
        </button>
        <button
          className="btn-glow px-5 py-2 rounded-lg text-sm font-medium"
          style={activeSeries.mode === 'free'
            ? { background: 'var(--accent-gold)', color: '#0a0a0f' }
            : { background: 'var(--bg-surface)', color: 'var(--ink-secondary)', border: '1px solid var(--border)' }}
          onClick={() => setSeriesMode(activeSeries.id, 'free')}
        >
          自由模式
        </button>
      </div>

      {/* ═══ 系列 Tab ═══ */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {seriesList.map((s) => (
          <div
            key={s.id}
            className="flex items-center rounded-lg overflow-hidden"
            style={{
              border: `1px solid ${activeSeriesId === s.id ? 'var(--accent-gold)' : 'var(--border)'}`,
              background: activeSeriesId === s.id ? 'rgba(212,168,83,0.1)' : 'var(--bg-surface)',
            }}
          >
            <button
              className="px-3 py-1.5 text-sm tap-highlight"
              style={{ color: activeSeriesId === s.id ? 'var(--accent-gold)' : 'var(--ink-secondary)' }}
              onClick={() => setActiveSeriesId(s.id)}
            >
              {s.name}{s.generated ? ' ✓' : ''}
            </button>
            <button
              className="px-2 py-1.5 text-xs"
              style={{ color: 'var(--ink-muted)' }}
              onClick={() => removeSeries(s.id)}
              title="删除系列"
            >×</button>
          </div>
        ))}
        {seriesList.length < MAX_SERIES && (
          <button
            className="px-3 py-1.5 rounded-lg text-sm border-dashed border"
            style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
            onClick={addSeries}
          >+ 新建系列</button>
        )}
      </div>

      <div className="flex gap-6">
        {/* ═══ 左栏（共享） ═══ */}
        <div className="flex-shrink-0" style={{ width: '260px' }}>
          {/* 手部照片选用（来自护甲知识档案） */}
          <GlassCard className="mb-4">
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>手部照片</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>来自护甲知识档案，用于虚拟试戴</p>

            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>当前选用</span>
              <button className="text-xs" style={{ color: 'var(--accent-gold)' }} onClick={() => setHandPicker(true)}>
                {handPhoto ? '更换' : '选择'}
              </button>
            </div>
            {handPhoto ? (
              <img src={handPhoto.image} alt="手部照片" className="w-full rounded-lg" />
            ) : (
              <div className="border-2 border-dashed rounded-lg p-4 text-center" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>未选用</p>
              </div>
            )}
            {!handPhoto && (
              <p className="text-xs mt-3" style={{ color: '#e94560' }}>请先选用一张手部照片</p>
            )}
          </GlassCard>

          {/* 通用护甲建议（替换原「手型分析」写死数据） */}
          <GlassCard className="mb-4">
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ink)' }}>护甲建议</h3>
            <ul className="space-y-1.5">
              {NAIL_CARE_TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink-secondary)' }}>
                  <span style={{ color: 'var(--accent-gold)' }}>◆</span>{tip}
                </li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ink)' }}>拍摄指南</h3>
            <ul className="space-y-1.5">
              {['手掌自然展开，手指并拢', '在充足光线下拍摄', '保持相机与手部平行', '背景尽量简洁'].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink-secondary)' }}><span style={{ color: 'var(--accent-gold)' }}>{i + 1}.</span>{tip}</li>
              ))}
            </ul>
          </GlassCard>
        </div>

        {/* ═══ 右栏（当前系列编辑区） ═══ */}
        <div className="flex-1 min-w-0">
          {/* 系列名编辑 */}
          <GlassCard className="mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>系列名：</span>
              <input
                type="text"
                value={activeSeries.name}
                onChange={(e) => renameSeries(activeSeries.id, e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border text-sm outline-none input-glow"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }}
              />
            </div>
          </GlassCard>

          {activeSeries.mode === 'guided' ? (
            <>
              {/* 引导模式 */}
              <GlassCard className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>1</span>
                  <h3 className="font-bold" style={{ color: 'var(--ink)' }}>主题名称</h3>
                </div>
                <input type="text" placeholder="为你的痛甲设计命名..." value={activeSeries.themeName} onChange={(e) => updateActive('themeName', e.target.value)} className="w-full px-4 py-2.5 rounded-lg border text-sm mb-4 outline-none" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }} />
                <p className="text-xs mb-2" style={{ color: 'var(--ink-muted)' }}>参考图上传（可选，本系列独立）</p>
                {activeSeries.refImage ? (
                  <div className="relative inline-block">
                    <img src={activeSeries.refImage} alt="参考图" className="w-32 h-32 rounded-lg object-cover" />
                    <button className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--ink)' }} onClick={() => updateActive('refImage', null)}>x</button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer inline-block" style={{ borderColor: 'var(--border)' }} onClick={() => refInputRef.current?.click()}>
                    <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>点击上传参考图</p>
                  </div>
                )}
                <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, (v) => updateActive('refImage', v))} />
              </GlassCard>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <GlassCard>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>2</span>
                    <h3 className="font-bold" style={{ color: 'var(--ink)' }}>角色/元素</h3>
                  </div>
                  <input type="text" placeholder="如：骷髅头、初音未来..." value={activeSeries.characters} onChange={(e) => updateActive('characters', e.target.value)} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none input-glow" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }} />
                </GlassCard>
                <GlassCard>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>3</span>
                    <h3 className="font-bold" style={{ color: 'var(--ink)' }}>标志性符号</h3>
                  </div>
                  <input type="text" placeholder="如：闪电、樱花、十字架..." value={activeSeries.signatureSymbol} onChange={(e) => updateActive('signatureSymbol', e.target.value)} className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none input-glow" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)' }} />
                </GlassCard>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <GlassCard>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>4</span>
                    <h3 className="font-bold" style={{ color: 'var(--ink)' }}>主色板</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {PALETTE_PRESETS.map((p, pi) => (
                      <div key={pi} className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => updateActive('palette', p)}>
                        <div className="flex gap-0.5 p-1 rounded-lg border-2 transition-all" style={{ borderColor: activeSeries.palette === p ? 'var(--accent-gold)' : 'var(--border)', boxShadow: activeSeries.palette === p ? '0 0 12px rgba(212, 168, 83, 0.3)' : 'none' }}>
                          {p.slice(0, 3).map((color: string, ci: number) => (
                            <div key={ci} className="w-5 h-5 rounded" style={{ background: color }} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>5</span>
                    <h3 className="font-bold" style={{ color: 'var(--ink)' }}>风格标签</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {STYLE_TAGS.map((tag: string) => (
                      <Tag key={tag} active={activeSeries.styleTags.includes(tag)} onClick={() => toggleTag(tag, activeSeries.styleTags, (v) => updateActive('styleTags', v))} size="sm">{tag}</Tag>
                    ))}
                  </div>
                  <p className="text-xs mb-2 font-medium" style={{ color: 'var(--ink-muted)' }}>可选工艺</p>
                  <div className="flex flex-wrap gap-2">
                    {TECHNIQUE_TAGS.map((tag: string) => (
                      <Tag key={tag} active={activeSeries.techniques.includes(tag)} onClick={() => toggleTag(tag, activeSeries.techniques, (v) => updateActive('techniques', v))} size="sm">{tag}</Tag>
                    ))}
                  </div>
                </GlassCard>
              </div>
            </>
          ) : (
            <>
              {/* 自由模式 */}
              <GlassCard className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>1</span>
                  <h3 className="font-bold" style={{ color: 'var(--ink)' }}>效果描述（Prompt）</h3>
                </div>
                <textarea
                  value={activeSeries.promptText}
                  onChange={(e) => updateActive('promptText', e.target.value)}
                  rows={12}
                  placeholder={FREE_PROMPT_TEMPLATE}
                  className="w-full px-4 py-3 rounded-lg border text-sm outline-none input-glow resize-y leading-relaxed"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--ink)', fontFamily: 'inherit' }}
                />
                <p className="text-xs mt-2" style={{ color: 'var(--ink-muted)' }}>模板已预填，直接在上面修改/删除/编写即可。</p>
              </GlassCard>

              <GlassCard className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>2</span>
                  <h3 className="font-bold" style={{ color: 'var(--ink)' }}>可选工艺</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TECHNIQUE_TAGS.map((tag: string) => (
                    <Tag key={tag} active={activeSeries.techniques.includes(tag)} onClick={() => toggleTag(tag, activeSeries.techniques, (v) => updateActive('techniques', v))} size="sm">{tag}</Tag>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--accent-gold)', color: '#0a0a0f' }}>3</span>
                  <h3 className="font-bold" style={{ color: 'var(--ink)' }}>参考图（可选）</h3>
                </div>
                {activeSeries.refImage ? (
                  <div className="relative inline-block">
                    <img src={activeSeries.refImage} alt="参考图" className="w-32 h-32 rounded-lg object-cover" />
                    <button className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer" style={{ background: 'rgba(0,0,0,0.6)', color: 'var(--ink)' }} onClick={() => updateActive('refImage', null)}>x</button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer inline-block" style={{ borderColor: 'var(--border)' }} onClick={() => refInputRef.current?.click()}>
                    <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>点击上传参考图</p>
                  </div>
                )}
                <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, (v) => updateActive('refImage', v))} />
              </GlassCard>
            </>
          )}

          {/* 当前系列生成按钮 */}
          <div className="flex justify-end mb-6">
            <Button variant="glass" onClick={() => handleGenerateSeries(activeSeries.id)} disabled={generatingId === activeSeries.id}>
              {generatingId === activeSeries.id
                ? 'AI 生成中，请稍候…'
                : activeSeries.generated ? '重新生成本系列' : '生成本系列（5指）'}
            </Button>
          </div>

          {/* 本系列整张 5 指图 */}
          {activeSeries.generated && activeSeries.nailSetImage && (
            <GlassCard className="mb-6">
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>{activeSeries.name} · 5 指美甲预览</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--ink-muted)' }}>从左到右：拇指 → 食指 → 中指 → 无名指 → 小指</p>
              <div className="rounded-lg overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
                <img src={activeSeries.nailSetImage} alt="5 指美甲" className="w-full object-contain" />
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* ═══ 单手试戴预览 ═══ */}
      <GlassCard className="mt-6">
        <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--ink)' }}>试戴预览</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--ink-muted)' }}>把当前系列的 5 指美甲贴到你选用的手部照片上，确认效果后保存为设计方案。</p>

        {!activeSeries.generated || !activeSeries.nailSetImage ? (
          <p className="text-sm text-center py-8 mb-2" style={{ color: 'var(--ink-muted)' }}>还没有生成结果，请先在上方点「生成本系列（5指）」。</p>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-surface)', maxWidth: '420px', width: '100%', aspectRatio: '3/4' }}>
                {tryOnImage ? (
                  <img src={tryOnImage} alt="试戴效果" className="w-full h-full object-contain" />
                ) : handPhoto ? (
                  <img src={handPhoto.image} alt="手部照片" className="w-full h-full object-contain opacity-60" />
                ) : (
                  <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>未选用手部照片</p>
                )}
              </div>
            </div>
            <div className="flex justify-center mb-2">
              <Button variant="glass" onClick={handleTryOn} disabled={tryOnLoading}>
                {tryOnLoading ? 'AI 试戴中，请稍候…' : (tryOnImage ? '重新生成试戴预览' : '生成试戴预览')}
              </Button>
            </div>
            {tryOnImage && (
              <p className="text-xs text-center mb-2" style={{ color: 'var(--ink-muted)' }}>已把甲片贴到你的手部照片上（手部与背景保持不变）</p>
            )}
          </>
        )}
      </GlassCard>

      {/* ═══ 底部：生成我的定制美甲（居中） ═══ */}
      <div className="flex justify-center mt-10 mb-6">
        <Button variant="gold" size="lg" onClick={handleGenerateFinal}>生成我的定制美甲</Button>
      </div>

      {/* ═══ 手部照片选择弹窗 ═══ */}
      {handPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setHandPicker(false)}>
          <div className="rounded-xl p-6 max-w-xl w-full mx-4 max-h-[80vh] overflow-y-auto" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold" style={{ color: 'var(--ink)' }}>选择手部照片</h3>
              <button className="text-sm" style={{ color: 'var(--ink-muted)' }} onClick={() => setHandPicker(false)}>关闭</button>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                className="flex-1 py-2 rounded-lg text-sm border-2 border-dashed"
                style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}
                onClick={() => setTimeout(() => newHandInputRef.current?.click(), 0)}
              >+ 现在拍/传一张新的</button>
            </div>

            {handPhotos.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: 'var(--ink-muted)' }}>还没有历史照片，请先拍/传一张</p>
            ) : (
              <>
                <p className="text-xs mb-2" style={{ color: 'var(--ink-muted)' }}>从历史照片中选择：</p>
                <div className="grid grid-cols-3 gap-3">
                  {handPhotos.map((p) => {
                    const selected = selectedHandId === p.id;
                    return (
                      <button
                        key={p.id}
                        className="cursor-pointer rounded-lg overflow-hidden border-2"
                        style={{ borderColor: selected ? 'var(--accent-gold)' : 'var(--border)' }}
                        onClick={() => { setSelectedHand(p.id); setHandPicker(false); }}
                      >
                        <img src={p.image} alt="" className="w-full aspect-square object-cover" />
                        <p className="text-[10px] py-0.5" style={{ color: 'var(--ink-muted)' }}>
                          {new Date(p.takenAt).toLocaleDateString()}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <button
                  className="w-full mt-4 py-2 rounded-lg text-sm border"
                  style={{ borderColor: 'var(--border)', color: 'var(--ink-muted)' }}
                  onClick={() => { setSelectedHand(null); setHandPicker(false); }}
                >取消选用</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 新拍手部照片的隐藏 input */}
      <input
        ref={newHandInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNewHandUpload}
      />
    </div>
  );
}

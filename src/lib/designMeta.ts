// 按用户输入「规则推导」设计方案的元数据（不再随机、也不额外调 AI）。
// 供设计工作台保存「我的定制美甲」时调用，产出 Style DNA / 施工难度 / 材料清单。
import type { StyleDNA, Material } from './types';

export interface DesignMetaInput {
  mode: 'guided' | 'free';
  themeName?: string;
  characters?: string;
  signatureSymbol?: string;
  palette?: string[];
  styleTags?: string[];
  techniques?: string[];
  promptText?: string;
}

// 工艺 → 对应材料
const TECHNIQUE_MATERIALS: Record<string, Material[]> = {
  '手绘': [{ name: '手绘颜料套装', quantity: '1套' }],
  '渐变': [{ name: '渐变粉', quantity: '适量' }],
  '闪粉': [{ name: '闪粉', quantity: '适量' }],
  '贴钻': [{ name: '水钻/贴钻', quantity: '20颗' }],
  '法式': [{ name: '法式定位贴', quantity: '1张' }],
  '猫眼': [{ name: '猫眼胶', quantity: '1瓶' }],
  '浮雕': [{ name: '浮雕胶', quantity: '1瓶' }],
  '镜面': [{ name: '镜面粉', quantity: '1瓶' }, { name: '金属箔', quantity: '1张' }],
};

// 工艺难度权重（用于计算施工难度）
const TECHNIQUE_WEIGHT: Record<string, number> = {
  '手绘': 3, '浮雕': 3, '镜面': 2, '猫眼': 2, '贴钻': 2, '法式': 1, '渐变': 1, '闪粉': 1,
};

// 风格标签 → 氛围（vibe）
const STYLE_VIBE: Record<string, string> = {
  '暗黑摇滚': '叛逆不羁',
  '动漫表情包': '俏皮可爱',
  'Q版角色': '元气满满',
  '专辑封面风': '酷飒自信',
  '日系少女': '温柔治愈',
  '赛博朋克': '未来科技',
  '哥特洛丽塔': '神秘暗黑',
  'Y2K千禧': '复古怀旧',
};

// 风格标签 → 情绪（mood）
const STYLE_MOOD: Record<string, string> = {
  '暗黑摇滚': '暗黑摇滚',
  '动漫表情包': '动漫热血',
  'Q版角色': '甜美少女',
  '专辑封面风': '街头潮流',
  '日系少女': '甜美少女',
  '赛博朋克': '赛博朋克',
  '哥特洛丽塔': '哥特优雅',
  'Y2K千禧': 'Y2K复古',
};

// 从一段自由文本里命中已知关键词
function hitKeywords(text: string, keys: string[]): string[] {
  return keys.filter((k) => text.includes(k));
}

// 综合拿到「有效的风格标签 / 工艺」——引导模式取所选，自由模式从文本命中
function resolveTags(input: DesignMetaInput): { styleTags: string[]; techniques: string[] } {
  if (input.mode === 'free') {
    const text = input.promptText || '';
    return {
      styleTags: hitKeywords(text, Object.keys(STYLE_MOOD)),
      techniques: hitKeywords(text, Object.keys(TECHNIQUE_WEIGHT)),
    };
  }
  return {
    styleTags: input.styleTags || [],
    techniques: input.techniques || [],
  };
}

export function deriveStyleDNA(input: DesignMetaInput): StyleDNA {
  const { styleTags, techniques } = resolveTags(input);
  const firstStyle = styleTags[0];
  const mood = firstStyle ? (STYLE_MOOD[firstStyle] || firstStyle) : (input.themeName?.trim() || '个性定制');
  const vibe = firstStyle ? (STYLE_VIBE[firstStyle] || '精致优雅') : '精致优雅';
  // 材质取第一个工艺对应主材料名，否则用甲油胶兜底
  const firstTech = techniques[0];
  const material = firstTech && TECHNIQUE_MATERIALS[firstTech]
    ? TECHNIQUE_MATERIALS[firstTech][0].name
    : '甲油胶';
  const palette = (input.palette && input.palette.length ? input.palette : ['#1a1a2e', '#16213e', '#0f3460', '#e94560']).slice(0, 4);
  return { mood, material, palette, vibe };
}

export function deriveDifficulty(input: DesignMetaInput): number {
  const { techniques } = resolveTags(input);
  if (techniques.length === 0) return 1;
  const weight = techniques.reduce((sum, t) => sum + (TECHNIQUE_WEIGHT[t] || 1), 0);
  // 权重 + 工艺数量 → 1~5
  const score = Math.ceil((weight + techniques.length) / 2);
  return Math.max(1, Math.min(5, score));
}

export function deriveMaterials(input: DesignMetaInput): Material[] {
  const { techniques } = resolveTags(input);
  const list: Material[] = [
    { name: '底胶', quantity: '1瓶' },
    { name: '封层', quantity: '1瓶' },
  ];
  // 有色板则加一支主色甲油胶
  if (input.palette && input.palette.length) {
    list.unshift({ name: '主色甲油胶', quantity: '1瓶' });
  }
  const seen = new Set(list.map((m) => m.name));
  for (const t of techniques) {
    for (const mat of TECHNIQUE_MATERIALS[t] || []) {
      if (!seen.has(mat.name)) {
        list.push(mat);
        seen.add(mat.name);
      }
    }
  }
  return list;
}

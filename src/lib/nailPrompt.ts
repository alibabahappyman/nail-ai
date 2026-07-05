// 痛甲提示词（TS 版，供 API 路由使用）
// 关键约束：生成一张 1行×5列 的网格图，5 个甲片（单手），只出甲片本身、不出手指。

const STYLE_MAP: Record<string, string> = {
  '暗黑摇滚': 'dark rock aesthetic, edgy gothic vibe',
  '动漫表情包': 'anime sticker / meme style, cute expressive faces',
  'Q版角色': 'chibi character art, kawaii deformed style',
  '专辑封面风': 'music album cover inspired, editorial graphic style',
  '日系少女': 'Japanese girly kawaii style, soft and sweet',
  '赛博朋克': 'cyberpunk neon aesthetic, futuristic',
  '哥特洛丽塔': 'gothic lolita aesthetic, ornate dark romance',
  'Y2K千禧': 'Y2K millennium aesthetic, glossy playful retro-futuristic',
};

const TECHNIQUE_MAP: Record<string, string> = {
  '手绘': 'hand-painted art',
  '渐变': 'gradient ombre',
  '闪粉': 'glitter / shimmer finish',
  '贴钻': 'rhinestone / crystal embellishments',
  '法式': 'french tip style',
  '猫眼': 'cat-eye magnetic gel effect',
  '浮雕': 'embossed 3D relief',
  '镜面': 'mirror chrome finish',
};

export interface NailPromptInput {
  mode: 'guided' | 'free';
  // guided
  themeName?: string;
  characters?: string;
  signatureSymbol?: string;
  palette?: string[];
  styleTags?: string[];
  techniques?: string[];
  // free
  promptText?: string;
  // 是否带了参考图（影响措辞）
  hasRefImage?: boolean;
}

// 网格布局说明：一排 5 个甲片 = 单手拇指→小指
const GRID_INSTRUCTION =
  "COMPOSITION (VERY IMPORTANT): produce ONE image containing EXACTLY 5 separate press-on nail tips (false nail tips only), " +
  "arranged in a strict single row of 5 columns on a PURE WHITE seamless background. " +
  "The 5 nails, from left to right, are for ONE hand ordered: thumb, index finger, middle finger, ring finger, little finger. " +
  "Each nail tip is centered inside its own equal-sized grid cell with generous even spacing between them. " +
  "Render each nail with realistic per-finger shape and size: thumb nail widest and shorter, " +
  "little-finger nail narrowest and smallest, index/middle/ring graduated in between. " +
  "CRITICAL: show ONLY the 5 detached artificial nail tips themselves — like a press-on nail product kit laid flat on white. " +
  "Absolutely NO fingers, NO finger tips, NO hands, NO knuckles, NO skin, NO flesh, NO nail bed of a real finger, " +
  "NO text, NO labels, NO numbering, NO decorative borders. Each tip is an isolated object floating on pure white. " +
  "Glossy realistic gel finish, professional product photography, soft studio lighting, high detail.";

const NEGATIVE =
  "Avoid at all costs: fingers, finger tips, hands, skin, flesh, knuckles, wrist, arm, real nail beds attached to fingers, " +
  "text, numbers, labels, decorative corners, watermark, " +
  "overlapping nails, nails touching each other, uneven spacing, fewer or more than 5 nails, blurry, low quality.";

export function buildNailSetPrompt(input: NailPromptInput): string {
  const parts: string[] = [];

  if (input.hasRefImage) {
    parts.push(
      "Design a set of 'itasha' fan nail art (痛甲) inspired by the reference character image. " +
      "Extract the character, signature colors and iconic motifs from the reference image and turn them into a cohesive 5-nail set for one hand."
    );
  } else {
    parts.push("Design a cohesive set of 5 fan nail art (痛甲) tips for one hand as described below.");
  }

  if (input.mode === 'free' && input.promptText && input.promptText.trim()) {
    parts.push(`User description: ${input.promptText.trim()}`);
  } else {
    if (input.themeName) parts.push(`Theme: ${input.themeName}.`);
    if (input.characters) parts.push(`Character / element: ${input.characters}.`);
    if (input.signatureSymbol) parts.push(`Signature symbol: ${input.signatureSymbol}.`);
    const styles = (input.styleTags || []).map((t) => STYLE_MAP[t]).filter(Boolean);
    if (styles.length) parts.push(`Style: ${styles.join(', ')}.`);
    if (input.palette && input.palette.length) parts.push(`Main color palette: ${input.palette.join(', ')}.`);
  }

  // 工艺（两种模式都可能有）
  const techs = (input.techniques || []).map((t) => TECHNIQUE_MAP[t]).filter(Boolean);
  if (techs.length) parts.push(`Finish / technique: ${techs.join(', ')}.`);

  parts.push(GRID_INSTRUCTION);
  parts.push(NEGATIVE);

  return parts.join(' ');
}

// ===== 虚拟试戴提示词 =====
// 第一张图 = 用户手部照片（基底，绝对不能改）；第二张图 = 生成的 5 甲片套装（只取花样）。
export function buildTryOnPrompt(): string {
  return [
    "You are given TWO images. IMAGE 1 is a real photo of a single human hand. IMAGE 2 is a set of 5 designed nail tips on a white background.",
    "TASK: perform a LOCAL PHOTO EDIT on IMAGE 1 only. Use IMAGE 1 as the fixed base layer. Paint / overlay the nail designs from IMAGE 2 onto the existing fingernails of the hand in IMAGE 1, as a realistic virtual manicure try-on.",
    "ABSOLUTE CONSTRAINTS — the output MUST be IMAGE 1 with ONLY the fingernails changed:",
    "- ONLY modify the nails of the hand in the image. Nothing else may change.",
    "- Keep the hand's appearance, pose, position, rotation, finger positions and spread EXACTLY as in IMAGE 1. Do not move or re-pose anything.",
    "- Keep the skin tone, skin texture, wrinkles and knuckles identical to IMAGE 1.",
    "- Keep the BACKGROUND of IMAGE 1 completely unchanged — same colors, same objects, same lighting. Do NOT replace it with a white or studio background.",
    "- Keep the camera angle, framing, zoom and overall composition identical to IMAGE 1.",
    "- Do NOT redraw, regenerate or stylize the hand. Every pixel outside the fingernails must stay the same as IMAGE 1.",
    "ONLY the nail surfaces may change: apply the corresponding designs so each nail looks naturally painted, following each finger's angle and curvature, with realistic shadows and glossy reflections that match IMAGE 1's original lighting.",
    "Do NOT output the nail-set grid from IMAGE 2. Do NOT output a plain white background. Output ONE photorealistic image that is clearly the original hand photo (IMAGE 1) now wearing the designed nails.",
    "Avoid: changing the hand's appearance or pose, moving fingers, altering skin, replacing or removing the background, white background, studio background, returning the nail grid, decorative borders, extra fingers, deformed hand, blurry, low quality.",
  ].join(' ');
}

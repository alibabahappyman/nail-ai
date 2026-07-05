// Gemini 3 Pro Image 调用（第三方中转，OpenAI 兼容格式）
// 仅供服务端 API 路由使用。返回值统一为一张图（data:image/...;base64 或 http url）。

interface GenerateArgs {
  prompt: string;
  images?: string[]; // 参考图（data url 或 http url），可 0~N 张
}

function getConfig() {
  const KEY = process.env.GEMINI_API_KEY;
  const BASE = (process.env.GEMINI_BASE_URL || '').replace(/\/+$/, '');
  const MODEL = process.env.GEMINI_MODEL || 'gemini-3-pro-image-preview';
  if (!KEY) throw new Error('缺少 GEMINI_API_KEY（请在 .env.local 填写）');
  if (!BASE) throw new Error('缺少 GEMINI_BASE_URL（请在 .env.local 填写）');
  return { KEY, BASE, MODEL };
}

// 从 OpenAI 兼容响应里取出图片 URL（中转常见返回：markdown 图片 / data url / images 数组）
function extractImage(data: any): string {
  const msg = data?.choices?.[0]?.message || {};

  if (Array.isArray(msg.images) && msg.images[0]) {
    const u = msg.images[0]?.image_url?.url || msg.images[0]?.url || msg.images[0];
    if (typeof u === 'string' && u) return u;
  }
  if (typeof msg.content === 'string') {
    const m = /!\[[^\]]*\]\(([^)]+)\)|(https?:\/\/\S+?\.(?:png|jpg|jpeg|webp))/i.exec(msg.content);
    if (m) return m[1] || m[2];
    if (msg.content.startsWith('data:image')) return msg.content.trim();
  }
  const err: any = new Error('Gemini 未返回图片');
  err.raw = data;
  throw err;
}

export async function geminiGenerate({ prompt, images = [] }: GenerateArgs): Promise<string> {
  const { KEY, BASE, MODEL } = getConfig();

  const content: any[] = [{ type: 'text', text: prompt }];
  for (const img of images) {
    if (typeof img === 'string' && img) {
      content.push({ type: 'image_url', image_url: { url: img } });
    }
  }

  const resp = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const err: any = new Error(`Gemini 请求失败 HTTP ${resp.status}`);
    err.raw = text;
    throw err;
  }

  const data = await resp.json();
  return extractImage(data);
}

import { NextRequest, NextResponse } from 'next/server';
import { buildTryOnPrompt } from '@/lib/nailPrompt';
import { geminiGenerate } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 300;

// POST /api/try-on
// body: { handImage: string(data url), nailImage: string(data url 或 url) }
// 返回: { image: string } —— 手戴上甲片的合成图
export async function POST(req: NextRequest) {
  try {
    const { handImage, nailImage } = await req.json();
    if (!handImage || typeof handImage !== 'string' || !handImage.startsWith('data:image')) {
      return NextResponse.json({ error: '请先上传手部照片' }, { status: 400 });
    }
    if (!nailImage || typeof nailImage !== 'string') {
      return NextResponse.json({ error: '缺少甲片图，请先生成痛甲设计' }, { status: 400 });
    }

    const prompt = buildTryOnPrompt();
    // 顺序即语义：先手图(IMAGE 1 基底)，再甲片图(IMAGE 2 花样)
    const image = await geminiGenerate({ prompt, images: [handImage, nailImage] });

    return NextResponse.json({ image });
  } catch (err: any) {
    console.error('[try-on]', err?.raw || err?.message || err);
    return NextResponse.json(
      { error: '试戴生成失败', detail: String(err?.raw || err?.message || err).slice(0, 500) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { buildNailSetPrompt, type NailPromptInput } from '@/lib/nailPrompt';
import { geminiGenerate } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 300; // 出图较慢，放宽超时（秒）

// POST /api/generate-nail-set
// body: NailPromptInput + { refImage?: string(data url) }
// 返回: { image: string }  —— 一张 1x5 网格的 5 甲片图（data url 或 http url）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const refImage: string | undefined =
      typeof body.refImage === 'string' && body.refImage.startsWith('data:image')
        ? body.refImage
        : undefined;

    const input: NailPromptInput = {
      mode: body.mode === 'free' ? 'free' : 'guided',
      themeName: body.themeName,
      characters: body.characters,
      signatureSymbol: body.signatureSymbol,
      palette: body.palette,
      styleTags: body.styleTags,
      techniques: body.techniques,
      promptText: body.promptText,
      hasRefImage: !!refImage,
    };

    // 校验：至少要有主题/描述/参考图之一，避免空提示词
    const hasContent =
      refImage ||
      (input.mode === 'free' ? (input.promptText && input.promptText.trim()) : (input.themeName && input.themeName.trim()));
    if (!hasContent) {
      return NextResponse.json({ error: '请填写主题名称或描述，或上传参考图' }, { status: 400 });
    }

    const prompt = buildNailSetPrompt(input);
    const image = await geminiGenerate({ prompt, images: refImage ? [refImage] : [] });

    return NextResponse.json({ image, prompt });
  } catch (err: any) {
    console.error('[generate-nail-set]', err?.raw || err?.message || err);
    return NextResponse.json(
      { error: '生成失败', detail: String(err?.raw || err?.message || err).slice(0, 500) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { InferenceClient } from "@huggingface/inference";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  prompt?: string;
  negativePrompt?: string;
  style?: "Anime" | "Realistic";
  aspectRatio?: "1:1" | "16:9" | "9:16";
};

type RateWindow = { startedAt: number; count: number };
const rateWindows = new Map<string, RateWindow>();
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;

function enforceRateLimit(request: NextRequest): boolean {
  const ip = request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const now = Date.now();
  const current = rateWindows.get(ip);

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateWindows.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= RATE_LIMIT) return false;

  current.count += 1;
  if (rateWindows.size > 10_000) {
    for (const [key, value] of rateWindows) {
      if (now - value.startedAt >= RATE_WINDOW_MS) rateWindows.delete(key);
    }
  }
  return true;
}

function buildPrompt(prompt: string, style: string, ratio: string) {
  const styleText = style === "Anime"
    ? "anime illustration, polished anime artwork, expressive composition"
    : "photorealistic, natural detail, professional photography, realistic lighting";
  const ratioText = ratio === "16:9" ? "wide landscape composition" : ratio === "9:16" ? "vertical portrait composition" : "square composition";
  return `${prompt.trim()}. ${styleText}, ${ratioText}.`;
}

export async function POST(request: NextRequest) {
  if (!enforceRateLimit(request)) {
    return NextResponse.json(
      { error: "Too many generation requests from this connection. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const token = process.env.HF_TOKEN;
  const model = process.env.HF_MODEL || "black-forest-labs/FLUX.1-schnell";

  if (!token) {
    return NextResponse.json(
      { error: "Image generation is not configured yet. Add HF_TOKEN to the deployment environment." },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 1600) : "";
  const negative = typeof body.negativePrompt === "string" ? body.negativePrompt.slice(0, 700) : "";
  const style = body.style === "Anime" ? "Anime" : "Realistic";
  const ratio = ["16:9", "9:16"].includes(body.aspectRatio || "") ? body.aspectRatio! : "1:1";

  if (prompt.trim().length < 3) {
    return NextResponse.json({ error: "Enter a more detailed prompt." }, { status: 400 });
  }

  const dimensions = ratio === "16:9"
    ? { width: 1024, height: 576 }
    : ratio === "9:16"
    ? { width: 576, height: 1024 }
    : { width: 1024, height: 1024 };

  try {
    const client = new InferenceClient(token);
    const image = await client.textToImage({
      provider: "auto",
      model,
      inputs: buildPrompt(prompt, style, ratio),
      parameters: {
        num_inference_steps: 4,
        negative_prompt: negative || undefined,
        ...dimensions
      }
    });

    const contentType = image.type || "image/png";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "The inference provider returned an unexpected response." }, { status: 502 });
    }
    const bytes = Buffer.from(await image.arrayBuffer());
    if (bytes.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Generated image exceeded the 12 MB limit." }, { status: 502 });
    }
    return NextResponse.json({ image: `data:${contentType};base64,${bytes.toString("base64")}` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown inference error";
    const friendly = /rate|quota|payment|credit/i.test(message)
      ? "The provider's available quota or rate limit has been reached. Try again later or check your Hugging Face billing and usage."
      : /loading|503|warm|cold/i.test(message)
      ? "The image model is loading or temporarily unavailable. Try again shortly."
      : `Image generation failed: ${message.slice(0, 220)}`;
    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}

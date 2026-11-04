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

function buildPrompt(prompt: string, negativePrompt: string, style: string, ratio: string) {
  const styleText = style === "Anime"
    ? "anime illustration, polished anime artwork, expressive composition"
    : "photorealistic, natural detail, professional photography, realistic lighting";
  const ratioText = ratio === "16:9" ? "wide landscape composition" : ratio === "9:16" ? "vertical portrait composition" : "square composition";
  const exclusions = negativePrompt.trim()
    ? ` Avoid these elements: ${negativePrompt.trim()}.`
    : "";
  return `${prompt.trim()}. ${styleText}, ${ratioText}.${exclusions}`;
}

export async function POST(request: NextRequest) {
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

  try {
    const client = new InferenceClient(token);
    const image = await client.textToImage({
      provider: "auto",
      model,
      inputs: buildPrompt(prompt, negative, style, ratio),
      parameters: { num_inference_steps: 5 }
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
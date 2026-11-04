# Dhrisya

A no-login AI image-generation portal starter built with Next.js. The gallery is stored in the visitor's browser. Image generation is routed through a server-side API endpoint so the Hugging Face token is never exposed to the browser.

## Run locally

1. Install Node.js 20 or later.
2. Copy `.env.example` to `.env.local`.
3. Create a Hugging Face token with access to Inference Providers and set `HF_TOKEN`.
4. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy the frontend

1. Push this project to a GitHub repository.
2. Import the repository into Vercel.
3. Add `HF_TOKEN` and optionally `HF_MODEL` under Project Settings → Environment Variables.
4. Redeploy.

The token must be a server-side environment variable. Do not use `NEXT_PUBLIC_HF_TOKEN`.

## Model and negative prompts

The default model is `black-forest-labs/FLUX.1-schnell`, selected for fast generation. The API uses the official `@huggingface/inference` JavaScript client with automatic provider routing.

FLUX.1 Schnell does not provide the same native negative-prompt conditioning as many Stable Diffusion pipelines. Dhrisya therefore converts the negative prompt into natural-language exclusion guidance. If strict negative conditioning is required, use a provider-supported Stable Diffusion XL model and update the API adapter accordingly.

## Free-tier constraints

Vercel's free tier can host the web app, but it does not supply a GPU. Hugging Face Inference Providers have availability, rate limits, and usage allowances that can change. This starter does not promise unlimited free generations. Add server-side rate limiting and abuse protection before opening it to the public.

## Current MVP behavior

- No user accounts.
- 1–4 sequential image requests per generation.
- Realistic and Anime prompt presets.
- Negative-prompt guidance.
- Aspect-ratio guidance in the prompt.
- Browser-local gallery and PNG download.
- Provider errors surfaced to the user.

The selected FLUX model may not enforce requested aspect ratios exactly; ratio is currently prompt guidance rather than a guaranteed output dimension.
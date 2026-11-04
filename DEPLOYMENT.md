# Deployment notes

## Hosting

Dhrisya can be deployed as a Next.js application on Vercel. Import `jaleelmkk/dhrisya` from GitHub and leave the framework preset as Next.js. The project uses Node.js 20.9 or later.

Add these server-side environment variables before deploying:

- `HF_TOKEN`: a Hugging Face user token with Inference Providers permission.
- `HF_MODEL` (optional): defaults to `black-forest-labs/FLUX.1-schnell`.

Do not commit real tokens or expose them through `NEXT_PUBLIC_*` variables.

## Free-tier reality

Vercel Hobby is free for personal, non-commercial use only. Review Vercel's current plan terms before using this deployment for a commercial service.

Hugging Face currently lists $0.10 in monthly Inference Providers credits for free accounts, subject to change. This is a small testing allowance, not enough to promise unlimited public image generation. Further inference usage requires purchased credits / paid usage. Do not enable paid usage until you have decided on a budget.

The app's no-login interface does not yet have a durable distributed rate limiter. Before making the endpoint widely public, add an IP-based limiter backed by a durable store (for example, Redis/KV) and abuse protection. The model provider may also impose rate limits or become temporarily unavailable.

## Verify after deployment

1. Open the Vercel deployment URL.
2. Submit one short test prompt.
3. Confirm the image appears in the gallery and can be downloaded.
4. Check Vercel function logs if the provider returns an error.
5. Confirm the Hugging Face account's usage and spending settings before sharing the URL broadly.

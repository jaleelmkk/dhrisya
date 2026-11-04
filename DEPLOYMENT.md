# Deployment notes

## Hosting

Dhrisya is configured as a Next.js application for Vercel. Import `jaleelmkk/dhrisya` from GitHub and leave the framework preset as Next.js. The project uses Node.js 20.9 or later.

Add these server-side environment variables before deploying:

- `HF_TOKEN`: a Hugging Face user token with Inference Providers permission.
- `HF_MODEL` (optional): defaults to `black-forest-labs/FLUX.1-schnell`.

Do not commit real tokens or expose them through `NEXT_PUBLIC_*` variables.

## Free-tier constraints

Vercel Hobby is free for personal, non-commercial use only. It is not an appropriate plan for monetized or commercial hosting. Review Vercel's current plan terms before sharing a public deployment.

Hugging Face lists $0.10 in monthly Inference Providers credits for free accounts, subject to change. This is a small testing allowance, not enough to promise unlimited public image generation. Additional inference requires purchased credits. Do not buy credits or enable paid usage unless you have chosen a budget.

The API currently includes a basic in-memory per-instance throttle of 8 image requests per minute per client IP. Serverless instances can restart or scale independently, so this is only a lightweight safeguard, not a durable global limit. Before broad public launch, add a shared rate limiter (for example, Redis/Upstash) and abuse protection.

## Verify after deployment

1. Open the Vercel deployment URL.
2. Submit one short test prompt.
3. Confirm the image appears in the gallery and can be downloaded.
4. Check Vercel function logs if the provider returns an error.
5. Confirm your Hugging Face usage and spending settings before sharing the URL broadly.

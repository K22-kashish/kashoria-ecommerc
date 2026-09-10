# KASHORIA — Upgraded Crochet E-Commerce Store

Preserves the original KASHORIA HTML/CSS/JS and product images while adding a modern Next.js App Router storefront and seller dashboard foundation.

## Run locally
Node.js 20+. Copy `.env.example` to `.env.local`, then `npm install` and `npm run dev`.

## Production
Run `supabase-schema.sql` in Supabase SQL Editor. Add Supabase and Razorpay environment variables in Vercel. Configure the Razorpay webhook to `/api/payment/webhook`. The MVP uses manual courier/tracking fields; Shiprocket can be integrated later.

**Payment safety:** production payment state must be based on verified Razorpay signatures/webhooks, not an untrusted browser callback. Never expose service-role or Razorpay secret keys.

## Existing project
Original pages and assets remain in the root. Active upgraded app is under `src/`; images are copied to `public/images/`.

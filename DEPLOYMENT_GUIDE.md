# KASHORIA — Netlify + Backend Deployment

This package is split into two deployable parts:

- `netlify-site/` = customer-facing static website for Netlify
- `backend/` = Node.js + Express + MySQL API for Render (or another Node host)

## 1. Put the project on GitHub

Create one private GitHub repository and upload this entire folder. **Do not upload `.env` or real passwords.**

## 2. Deploy the backend

Recommended: Render Web Service.

Root Directory: `backend`
Build Command: `npm ci`
Start Command: `npm start`
Health Check: `/api/health`

Add all environment variables from `backend/.env.example` in Render.

Important:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` must point to a cloud MySQL database.
- Your current Windows `localhost` MySQL is NOT reachable by a public Render service.
- Set `FRONTEND_URL` to your Netlify URL, for example `https://kashoria.netlify.app`.
- Generate a strong random `JWT_SECRET`.
- Set production Razorpay keys/webhook secret if online payments are enabled.

After deployment, open:
`https://YOUR-BACKEND.onrender.com/api/health`

It should return JSON showing the database is connected.

## 3. Deploy the frontend to Netlify

Create a Netlify site from the same GitHub repository.

Build command:
`node scripts/build-netlify.mjs`

Publish directory:
`netlify-site`

Add this Netlify environment variable:

`KASHORIA_API_URL=https://YOUR-BACKEND.onrender.com`

Then redeploy.

The build automatically writes `netlify-site/js/config.js` with the backend URL.

## 4. Admin login

Use your existing admin credentials. If the production database is new, run `node seed-admin.js` against that production database (or create the admin through your database process) before logging in.

## 5. Database

Import your existing KASHORIA MySQL database/schema/data into a cloud MySQL provider. The backend expects the existing tables including `products`, `orders`, `order_items`, `users`, etc.

## 6. Final testing checklist

Customer:
- Home
- Shop
- Product colour options
- Add to cart
- Wishlist
- Checkout
- Place Order
- Order confirmation
- Order tracking
- Reviews
- Custom order

Admin:
- Login
- Products
- Orders
- Customer details
- Product/colour/quantity/price
- Totals
- Payment status
- Coupon
- Notes
- Status update
- Courier/tracking

## Important storage note

The custom-order/reference upload currently writes files to the backend `uploads/` directory. Many cloud hosts use ephemeral filesystems, so uploaded reference images should eventually be moved to persistent object storage (such as S3/Cloudinary/Supabase Storage) if you need them to survive redeploys.

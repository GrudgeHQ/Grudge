# Deployment Guide

This guide helps you deploy Grudge App to production, with performance and security best practices.

## 1) Prerequisites

- Node.js 18+
- A production database (recommended: PostgreSQL like Neon/Supabase/RDS)
- Environment variables configured (.env)
- Optional real-time service (Pusher) keys

## 2) Configure environment variables

Copy `.env.example` to `.env` and set values:

- DATABASE_URL: Production DB URL (Postgres recommended)
- NEXT_PUBLIC_SITE_URL: Public HTTPS URL (e.g., https://app.example.com)
- NEXTAUTH_URL: Same as above for NextAuth
- NEXTAUTH_SECRET: A strong random string
- Optional Pusher credentials for realtime events

On Vercel, add these in Project Settings → Environment Variables.

## 3) Database setup (Prisma)

- Push or migrate schema:
  - Development: `npx prisma db push`
  - Production Migrations: `npx prisma migrate deploy`
- (Optional) Seed data: `npm run prisma:seed` (avoid seeding in established prod)

## 4) Build and start

- Build: `npm run build`
- Start: `npm start`

Vercel will automatically build and deploy. For self-hosting:

- Reverse-proxy with HTTPS termination (NGINX/Caddy) or a platform that provides TLS.
- Ensure `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` are set for correct callback URLs and redirects.

## 5) Performance notes

- Next.js is configured with:
  - Compression enabled
  - Console removal in production
  - CSS optimization
  - Image optimization (AVIF/WebP)
- Database indexing is present in Prisma schema for common queries.
- Consider a production Postgres with connection pooling (e.g., PgBouncer) and tune `connection_limit` on DATABASE_URL.

## 6) Security hardening

- Security headers are returned via Next config (X-Frame-Options, X-Content-Type-Options, Referrer-Policy). HSTS is enabled in production.
- HTTPS redirect is enforced in production when `NEXT_PUBLIC_SITE_URL`/`NEXTAUTH_URL` is set.
- Set strong `NEXTAUTH_SECRET` and use secure cookies (NextAuth manages this in production).
- Add a Web Application Firewall (WAF) / rate-limiting on your edge/platform. (If needed, integrate Upstash Rate Limit in a middleware in the future.)

## 7) Monitoring & logs

- Prefer platform log drains (Vercel/Cloud provider) and connect to a log analytics tool (Datadog, Logtail, etc.).
- For error tracking, consider Sentry or similar. Keep secrets safe and scrub PII.

## 8) Going live checklist

- [ ] Set all env vars (especially NEXTAUTH_URL and NEXTAUTH_SECRET)
- [ ] Migrate DB (`prisma migrate deploy`) against production DB
- [ ] Create at least one admin user or seed minimal data
- [ ] `npm run build` completes with no errors
- [ ] Smoke test core flows (login, join team, create match, availability, leagues)
- [ ] Verify HTTPS and redirect from HTTP → HTTPS
- [ ] Validate real-time events if using Pusher
- [ ] Add analytics and uptime monitoring

## 9) Troubleshooting

- Unexpected HTML in JSON fetch: Ensure API routes exist and return JSON; client now guards against non-JSON, but check auth/redirects.
- DB connection issues: Verify DATABASE_URL; for serverless, use a pooled connection string or a provider like Neon/Supabase with pooling.
- Auth callbacks failing: Ensure NEXTAUTH_URL matches your public domain exactly.

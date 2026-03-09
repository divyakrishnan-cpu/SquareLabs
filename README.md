# SquareLabs — Marketing Intelligence Platform

> Built for Square Yards Marketing Team · Next.js 14 · TypeScript · Tailwind · PostgreSQL

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your DB URL and secrets

# 3. Set up database
npx prisma migrate dev --name init
npx prisma db seed

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign in with `divya.krishnan@squareyards.com` / `squarelabs2026`

## Modules Available

| Module | Path | Status |
|--------|------|--------|
| Dashboard Home | `/` | ✅ Live |
| Social Media Performance | `/social/performance` | ✅ Live |
| AI Content Planner | `/social/planner` | ✅ Live |
| Script Creator | `/social/scripts` | ✅ Live |
| Content Calendar & Publish | `/social/calendar` | ✅ Live |
| Post-Publish Notifications | `/social/notifications` | ✅ Live |
| Task Management | `/tasks` | 🔜 Coming Soon |
| KPI Dashboard | `/kpi` | 🔜 Coming Soon |
| ORM | `/orm` | 🔜 Coming Soon |
| AI Creative Generator | `/creatives` | 🔜 Coming Soon |

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Language**: TypeScript (strict)
- **Styling**: Tailwind CSS with custom design tokens
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js with credentials provider
- **Charts**: Recharts
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (dashboard)/          # All dashboard routes
│   │   ├── page.tsx          # Home / overview
│   │   └── social/           # Social Media Suite
│   └── api/                  # API routes
├── components/
│   ├── layout/               # Sidebar, Header
│   ├── social/               # SM feature components
│   └── ui/                   # Design system (Button, Card, Badge…)
├── lib/                      # db, auth, utils
├── types/                    # Shared TypeScript types
prisma/
├── schema.prisma
└── seed.ts
```

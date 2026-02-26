# Sportsdle — Daily Sports Trivia

A Wordle-style daily sports trivia game covering MLB, NFL, NBA, and NHL. Play for free (guest) or sign up to track XP, ranks, and challenge friends.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` |
| Auth | NextAuth v4 (credentials — email + password, JWT sessions) |
| Validation | Zod v4 |
| Deployment | Vercel-ready |

---

## Setup (Local Development)

### 1. Clone and install

```bash
cd sportsdle
npm install
```

### 2. Create your environment file

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# PostgreSQL connection string
# Neon: https://neon.tech  |  Supabase: https://supabase.com  |  Render: https://render.com
DATABASE_URL="postgresql://user:password@host:5432/sportsdle?sslmode=require"

# Generate a secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Push schema & seed the database

```bash
# Push schema (creates all tables)
npm run db:push

# Seed 120 questions (30 per sport)
npm run db:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Management

| Command | Description |
|---|---|
| `npm run db:push` | Push schema without migrations (great for dev) |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Seed 120 trivia questions |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:generate` | Regenerate Prisma client after schema changes |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT signing |
| `NEXTAUTH_URL` | ✅ | Full URL of your app (e.g. `https://sportsdle.vercel.app`) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | ❌ | AdSense publisher ID (`ca-pub-XXXXX`) |
| `NEXT_PUBLIC_ADSENSE_SLOT_FOOTER` | ❌ | AdSense footer slot ID |
| `NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR` | ❌ | AdSense sidebar slot ID |

---

## Deploying to Vercel

1. **Push your code** to GitHub / GitLab.

2. **Import** the project at [vercel.com/new](https://vercel.com/new). Point the root directory to `/sportsdle`.

3. **Set environment variables** in Vercel project settings:
   - `DATABASE_URL` — your Neon/Supabase/Render Postgres URL
   - `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate
   - `NEXTAUTH_URL` — your Vercel deployment URL (e.g. `https://sportsdle.vercel.app`)

4. **Deploy.** After the first deploy:
   ```bash
   # Run migrations on your hosted DB (one-time setup)
   npx prisma migrate deploy

   # Seed from your local machine (with DATABASE_URL set to prod)
   npm run db:seed
   ```

5. Vercel will auto-deploy on every push to main. ✅

### Recommended DB Providers

| Provider | Free Tier | Notes |
|---|---|---|
| [Neon](https://neon.tech) | ✅ 0.5 GB | Serverless Postgres, best for Vercel |
| [Supabase](https://supabase.com) | ✅ 500 MB | Good for future auth features |
| [Render](https://render.com) | ✅ Expiring | Sleeps after inactivity |

---

## AdSense Setup

1. Get your AdSense account approved at [adsense.google.com](https://adsense.google.com).

2. Add your script to `app/layout.tsx` `<head>`:
   ```tsx
   import Script from "next/script";
   // Inside <html>:
   <Script
     async
     src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
     crossOrigin="anonymous"
     strategy="afterInteractive"
   />
   ```

3. Set in `.env` / Vercel:
   ```env
   NEXT_PUBLIC_ADSENSE_CLIENT="ca-pub-XXXXXXXXXXXXXXXX"
   NEXT_PUBLIC_ADSENSE_SLOT_FOOTER="1234567890"
   NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR="0987654321"
   ```

4. The `<AdSlot />` component in [components/AdSlot.tsx](components/AdSlot.tsx) handles dev/prod guards automatically.

---

## Architecture Summary

```
app/
├── api/
│   ├── auth/[...nextauth]/   # NextAuth JWT handler
│   ├── register/             # User registration
│   ├── daily/                # GET daily questions (strips answers)
│   ├── attempt/
│   │   ├── start/            # Create or resume attempt
│   │   ├── answer/           # Submit answer (server-side scoring)
│   │   └── complete/         # Finalize + award XP
│   ├── leaderboard/          # Overall + per-sport leaderboards
│   ├── friends/              # request / accept / remove / list / compare
│   ├── profile/              # User stats
│   ├── settings/name/        # Update display name
│   └── user/search/          # Find users by name/email
├── play/[sport]/             # Quiz runner page (server → client handoff)
├── leaderboard/              # Public leaderboard
├── profile/                  # Auth-gated profile
├── friends/                  # Auth-gated social features
├── settings/                 # Auth-gated settings
├── login/ register/          # Auth pages
└── page.tsx                  # Home with sport tiles

components/
├── QuizRunner.tsx            # Full quiz state machine (client)
├── TimerBar.tsx              # Animated countdown timer
├── SportCard.tsx             # Home page sport tile
├── RankBadge.tsx             # Tier + division badge
├── NavBar.tsx                # Sticky nav with auth state
└── AdSlot.tsx                # AdSense placeholder

lib/
├── auth.ts                   # NextAuth config + getSession helper
├── db.ts                     # Prisma singleton with pg adapter
├── rank.ts                   # Pure rank computation (shared server+client)
└── daily.ts                  # Deterministic daily set generation
```

### Daily Quiz Selection

Questions are selected **deterministically** without a cron job:

1. On first request for `date + sport`, `getOrCreateDailySet()` fetches all questions for that sport.
2. Uses a simple LCG shuffle seeded by `"YYYY-MM-DD-SPORT"`.
3. Picks the first 8 questions from the shuffled list.
4. Stores the result in `DailySet` so subsequent requests are instant.

No cron required. If you want to pre-generate sets at midnight, call `GET /api/daily` for each sport via a Vercel Cron (see [Vercel Cron docs](https://vercel.com/docs/cron-jobs)).

### Scoring Formula

```
questionScore = isCorrect ? 100 + floor(remainingSeconds × 10) : 0
totalScore    = sum of all questionScores
xpEarned      = round(totalScore / 10)
```

Scoring is computed **server-side only** — the client never sends a score.

### Rank Tiers

| Tier | XP Range | Divisions |
|---|---|---|
| Bronze | 0 – 999 | 3, 2, 1 |
| Silver | 1,000 – 2,499 | 3, 2, 1 |
| Gold | 2,500 – 4,999 | 3, 2, 1 |
| Platinum | 5,000 – 9,999 | 3, 2, 1 |
| Diamond | 10,000+ | — |

---

## What Was Implemented (MVP Checklist)

- [x] Next.js App Router + TypeScript
- [x] Tailwind CSS v4 + shadcn/ui (dark theme)
- [x] PostgreSQL schema with Prisma 7 + pg adapter
- [x] Email + password auth (NextAuth v4, JWT sessions)
- [x] Guest play with localStorage completion tracking
- [x] Deterministic daily set generation (no cron needed)
- [x] Quiz runner: timer, MC + fill-blank, reveal, end screen
- [x] Server-side scoring (never trust client)
- [x] XP system + rank computation (Bronze → Diamond)
- [x] Leaderboards (overall + per-sport)
- [x] Friends (send/accept/remove requests, compare stats)
- [x] Profile page with per-sport rank progress bars
- [x] Settings page (update display name)
- [x] AdSense stub components with dev guard
- [x] 120 seed questions (30 per sport: MLB, NFL, NBA, NHL)
- [x] Share button (copy-to-clipboard result summary)
- [x] Resume in-progress attempt after refresh
- [x] One attempt per sport per day enforcement

---

## Assumptions Made

1. **Password auth only** — no magic links, no OAuth (add later via NextAuth providers).
2. **No email verification** — users register and immediately play.
3. **Fill-blank answers are normalized** (trim + lowercase) for lenient matching.
4. **Leaderboard is XP-based** (not daily score) for simplicity.
5. **No Redis rate limiting** — documented as a future need for production scale.
6. **Guest attempts** are not persisted to DB; localStorage tracks played status.

---

## What to Configure Next

1. **`DATABASE_URL`** — set up a Neon or Supabase database, add connection string.
2. **`NEXTAUTH_SECRET`** — generate with `openssl rand -base64 32`.
3. **`NEXTAUTH_URL`** — set to your production domain before deploying.
4. **Run migrations** — `npm run db:push` (dev) or `npx prisma migrate deploy` (prod).
5. **Seed questions** — `npm run db:seed`.
6. **AdSense** — add publisher ID + slot IDs once account is approved.

---

## Future Mobile App Roadmap

All game logic lives in Next.js Route Handlers (REST endpoints), making it trivial to reuse for a React Native / Expo mobile app:

- `GET /api/daily?sport=MLB&date=YYYY-MM-DD` — fetch questions
- `POST /api/attempt/start` — start attempt
- `POST /api/attempt/answer` — submit answer
- `POST /api/attempt/complete` — finalize

Authentication: swap NextAuth sessions for JWT tokens issued by the same backend (or add a `/api/auth/token` endpoint for mobile).

The rank computation in `lib/rank.ts` is a **pure function** — copy it directly into the mobile app for instant rank display without an API call.

# FanatIQ — Daily Sports Trivia App

A full-stack, production-ready daily sports trivia game built with the Next.js App Router. Users get one attempt per sport per day — answer 8 questions as fast as possible to earn XP, level up, and compete on leaderboards. Built entirely as a solo project to demonstrate end-to-end full-stack development.

**Live demo:** _deploy to Vercel + Neon in ~5 minutes (see setup below)_

---

## Features

- **Daily quiz** — 8 questions per sport (MLB, NFL, NBA), one attempt per day enforced at the database level
- **Speed-based scoring** — server-side only; faster correct answers earn more points (client never sends a score)
- **XP & leveling** — earn XP per quiz, level up across all sports combined with animated progress bar on the results screen
- **Leaderboards** — overall (level-based) and per-sport (XP-based) with live rankings
- **Social / friends** — send/accept/remove friend requests, compare head-to-head stats
- **Auth** — email + password registration and login with JWT sessions; real-time username availability check during signup
- **Forfeit system** — leaving mid-quiz forfeits remaining questions; XP for answered questions is awarded immediately via `sendBeacon` even if the user never returns
- **Profile page** — level badge, XP progress bar, per-sport stats, display name change, full data reset
- **Guest mode** — play without an account; completion tracked in localStorage
- **Share results** — copy emoji result summary to clipboard (Wordle-style)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (dark theme) |
| Database | PostgreSQL — Prisma 7 + `@prisma/adapter-pg` |
| Auth | NextAuth v4 — credentials provider, JWT sessions |
| Validation | Zod v4 |
| Deployment | Vercel + Neon (serverless Postgres) |

---

## Engineering Highlights

**Server-side scoring only** — answers are graded exclusively in Route Handlers. The client submits its choice; the server computes the score. There is no way for a user to manipulate their score from the browser.

**Deterministic daily set generation without a cron job** — `getOrCreateDailySet()` uses a seeded LCG shuffle (`"YYYY-MM-DD-SPORT"` as the seed) to pick the same 8 questions for all users on a given day. The result is cached in `DailySet` after the first request, so subsequent loads are a single DB read.

**Forfeit XP award via `sendBeacon`** — when a user navigates away mid-quiz, a `pagehide` listener fires `navigator.sendBeacon()` to `POST /api/attempt/forfeit`. The beacon is delivered even as the page unloads, so XP for answered questions is always awarded without requiring the user to return. A component unmount cleanup handles SPA navigation (Next.js `router.push`). Both paths are guarded by a `forfeitFiredRef` to prevent double-awarding.

**Global account XP leveling** — level is computed from total XP across all sports, not per-sport. The level-up animation on the results screen captures `previousTotalXp` and `newTotalXp` before and after the DB write, then animates the XP bar across level boundaries client-side with a pure closed-form formula (`xpToLevel(xp) = floor((-1 + √(9 + 4×xp/25)) / 2)`).

**Real-time username availability** — the registration form debounces a `GET /api/user/check-name` request 400 ms after each keystroke and shows a live green/red indicator. Case-insensitive uniqueness is enforced at both the UI and DB layers.

**Inline abandon detection** — on every visit to `/play/[sport]`, the server checks for an existing attempt with answers but no `completedAt`. If found (user abandoned mid-quiz), it awards XP immediately server-side as a fallback for cases where `sendBeacon` failed, then returns the forfeit screen.

---

## Architecture

```
app/
├── api/
│   ├── auth/[...nextauth]/   # NextAuth JWT handler
│   ├── register/             # User registration (case-insensitive name check)
│   ├── attempt/
│   │   ├── start/            # Create attempt record
│   │   ├── answer/           # Submit answer — server-side scoring
│   │   ├── complete/         # Finalize quiz, award XP, return level data
│   │   └── forfeit/          # sendBeacon target — awards partial XP on abandon
│   ├── leaderboard/          # Overall + per-sport rankings
│   ├── friends/              # request / accept / remove / list / compare
│   ├── user/
│   │   ├── check-name/       # Real-time username availability (GET)
│   │   ├── reset/            # Delete all attempt + XP data for current user
│   │   └── search/           # Find users by name or email
│   └── settings/name/        # Update display name
├── play/[sport]/             # Server component — enforce one-attempt rule, hand off to QuizRunner
├── leaderboard/              # Public leaderboard (overall + per-sport tabs)
├── profile/                  # Auth-gated — level, XP, per-sport stats, danger zone
├── friends/                  # Auth-gated social features
├── login/ register/          # Auth pages with inline validation
└── page.tsx                  # Home — sport tiles with played state

components/
├── QuizRunner.tsx            # Quiz state machine (pre → answering → between → done)
├── TimerBar.tsx              # Animated 10-second countdown
├── NavBar.tsx                # Sticky nav with avatar dropdown (client)
├── HomeWarningButton.tsx     # Inline leave confirmation during quiz
├── ProfileActions.tsx        # Name change + two-step data reset (client island)
├── SportCard.tsx             # Home page sport tile
└── SetPlayedFlag.tsx         # Sets localStorage on mount (tiny client island)

lib/
├── auth.ts                   # NextAuth config
├── db.ts                     # Prisma singleton (pg adapter)
├── daily.ts                  # Deterministic daily set generation
├── levels.ts                 # Pure XP/level math (xpToLevel, xpForLevel, xpProgress)
└── rank.ts                   # XP earned computation
```

---

## Scoring

```
questionScore = isCorrect ? 100 + floor(remainingSeconds × 10) : 0
totalScore    = sum of all questionScores          (max 200 per question)
xpEarned      = round(totalScore / 10)
```

Scoring is computed **server-side only** — the client submits an answer string; the server grades it and returns `isCorrect` + `score`.

---

## Local Setup

### 1. Install dependencies

```bash
cd sportsdle
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://user:password@host:5432/fanatiq?sslmode=require"
NEXTAUTH_SECRET="your-random-secret"   # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Push schema and seed

```bash
npm run db:push   # create tables
npm run db:seed   # seed 120 questions (30 per sport)
```

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Commands

| Command | Description |
|---|---|
| `npm run db:push` | Push schema changes (dev) |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Seed trivia questions |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:generate` | Regenerate Prisma client |

---

## Deploy to Vercel

1. Push to GitHub and import at [vercel.com/new](https://vercel.com/new).
2. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` in Vercel project settings.
3. After first deploy, run `npx prisma migrate deploy` and `npm run db:seed` from your local machine (with `DATABASE_URL` pointing to prod).

**Recommended DB:** [Neon](https://neon.tech) — serverless Postgres, free tier, zero cold-start latency on Vercel.

You are a senior full-stack engineer. Build a production-ready MVP web app for a daily sports trivia game, “Sportsdle” (Wordle-like daily ritual, but trivia). Prioritize: modern, simple UI, clean architecture, easy deployment, and extensibility for a future mobile app.

## Product Summary
- Daily trivia changes each day.
- Sports categories: MLB, Football (NFL), Basketball (NBA), Hockey (NHL).
- Anyone can play without signing in (guest mode).
- Creating an account enables:
  - XP & rank tracking
  - Separate rank per sport
  - Friends list
  - Compare stats vs friends
  - Global leaderboards (overall + per sport)

## Gameplay
- Each daily quiz: 5–10 questions (configurable). Default to 8 for MVP.
- Each question has a 10 second timer.
- Flow:
  1) User clicks Start to begin Q1 (timer begins)
  2) User answers (multiple choice OR fill-in-the-blank depending on question type)
  3) User clicks “Next” to begin Q2 (timer resets to 10 seconds)
  4) Repeat until end
  5) Show final score summary and earned XP, and per-sport rank progress if logged in
- Scoring:
  - Score is based on correctness + speed.
  - Implement a simple deterministic formula for MVP:
    - If correct: basePoints (e.g., 100) + timeBonus where timeBonus = floor(remainingSeconds * 10)
    - If incorrect or timeout: 0
  - Total score = sum of question points.
  - XP earned = round(totalScore / 10) (tunable constant).
- Anti-abuse:
  - Guest play can’t write to leaderboards.
  - Logged-in: one submission per sport per day. Allow “resume” if user refreshes mid-quiz.
  - Store per-question answer + timeTaken server-side to prevent client tampering.

## Monetization
- Add Google AdSense placeholders but keep it safe:
  - Include a dedicated ad slot component and a “Ads disabled in dev” guard.
  - Add instructions/comments for adding AdSense client + slot IDs via env vars.
  - Place ads in non-intrusive areas (e.g., footer + sidebar on desktop).

## Tech Stack (use this unless impossible)
- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui for components
- PostgreSQL with Prisma ORM
- Auth: NextAuth (Auth.js) with Email/Password OR magic link (choose email + password with credentials provider OR use email magic links with Resend; prefer simplest stable path for MVP)
- API layer: Next.js Route Handlers (REST-ish) OR tRPC. Prefer Route Handlers for simplicity.
- Hosting: Vercel-ready (include vercel deployment notes). DB can be Neon/Supabase/Render; provide generic Postgres connection string.
- Daily quiz selection:
  - Implement a “DailySet” concept with date (YYYY-MM-DD) and sport.
  - For MVP, seed a question bank and generate daily sets deterministically (e.g., by hashing date+sport) so it works without cron.
  - Also provide an optional cron endpoint (protected) for future scheduled generation.

## Data Model Requirements (Prisma)
Design Prisma schema with these core entities:
- User
- FriendRequest / Friendship (or a single Friendship table with status)
- Sport (enum: MLB, NFL, NBA, NHL)
- Question
  - sport
  - type: MULTIPLE_CHOICE | FILL_BLANK
  - prompt
  - choices (string[] nullable)
  - answer (string; for MC store exact choice; for fill blank store canonical answer)
  - difficulty (1–5 optional)
  - tags (string[] optional)
- DailySet
  - date
  - sport
  - questionIds (relation table DailySetQuestion for ordering)
- Attempt
  - userId nullable (guest attempts optional, but do not persist guest by default; instead store in localStorage)
  - date
  - sport
  - startedAt, completedAt
  - totalScore, xpEarned
- AttemptAnswer
  - attemptId
  - questionId
  - isCorrect
  - timeTakenMs
  - submittedAnswer
- Rank / XP per sport per user
  - userId
  - sport
  - xpTotal
  - rankTier (string)
  - division (string/int)
- Leaderboard view:
  - Derive from Rank/XP or store a materialized table (keep derived for MVP).

## Rank System (MVP placeholder)
Implement a simple tiering function based on xpTotal:
- Bronze: 0–999 (Div 3/2/1)
- Silver: 1000–2499
- Gold: 2500–4999
- Platinum: 5000–9999
- Diamond: 10000+
Division can be computed by splitting the tier range into 3 divisions.
Make rank computation a pure function shared by server + client.

## Pages / Routes (Next.js App Router)
Public:
- / (home): today’s sports tiles (MLB/NFL/NBA/NHL) + “Play Today”
- /play/[sport]: the quiz runner UI for that sport and today’s date
- /leaderboard: global leaderboard (overall) + tabs per sport (viewable without login)
- /login, /register (or a single /auth page)

Authed:
- /profile: user overview, per-sport XP/rank cards, recent attempts
- /friends: friend search/add, pending requests, friends list, compare stats
- /settings: basic account settings

## Quiz Runner UI Spec
- Clean and modern, mobile-friendly.
- Must have:
  - Start button to begin each question (including Q1)
  - Visible timer countdown (10s)
  - Multiple choice: buttons
  - Fill blank: input + submit
  - After answering, show correctness briefly (optional) but do NOT auto-advance; require user to click “Start Next Question”
  - Handle timeout: auto-mark incorrect and require clicking “Start Next Question”
  - End screen: score breakdown + xp gained + rank progress (if logged in) + share button (copy text)

## State & Persistence
- Guests:
  - Allow playing; store completion status for the day in localStorage so they can’t replay easily (soft restriction).
- Logged in:
  - Persist attempt state server-side so refresh can resume:
    - if started but not completed, load current question index and remaining time window (approx).
  - Enforce one completed attempt per sport per date.

## API Endpoints (Route Handlers)
Implement endpoints with proper validation (zod) and auth checks:
- GET /api/daily?sport=MLB&date=YYYY-MM-DD -> returns ordered questions (without answers) + dailySetId
- POST /api/attempt/start -> creates/resumes attempt (sport, date)
- POST /api/attempt/answer -> submit answer for question; server computes correctness and score using timeTaken; returns next state
- POST /api/attempt/complete -> finalize, compute xp, update rank table, return summary
- GET /api/leaderboard?sport=MLB -> top N users by xpTotal (or score today; pick xpTotal for MVP)
- Friends:
  - POST /api/friends/request, POST /api/friends/accept, POST /api/friends/remove
  - GET /api/friends/list
  - GET /api/friends/compare?userId=... (or compare with a friend)
- Auth routes per NextAuth.

## Security & Quality
- Do not leak correct answers to client until after submission.
- Rate limit sensitive endpoints lightly (simple in-memory limiter is ok for MVP; document need for Redis later).
- Use server-side scoring; never trust client score.
- Add basic error handling + loading states.
- Add eslint + prettier and sensible scripts.

## Seed Data
Create seed script with at least:
- 30 questions per sport (120 total) mix of MC + fill blank.
Questions should be generic sports facts (no copyrighted content).
Ensure answer normalization for fill blank (trim, lower-case).

## Deliverables
Create the full repo with:
- Next.js app code
- Prisma schema + migrations
- Seed script
- README with:
  - setup steps
  - env vars
  - running locally
  - deploying to Vercel
  - AdSense setup instructions
  - future roadmap for mobile app (API reuse)

## Implementation Details
- Use Server Components where appropriate but keep the quiz runner mostly client component.
- Use shadcn/ui for buttons, cards, tabs, inputs, toast.
- Use Tailwind for layout.
- Use date handling with a simple utility (avoid heavy libs if possible).
- Provide a clean component structure: /components, /lib, /app, /prisma, etc.

## After building
At the end, output:
1) A high-level architecture summary
2) A checklist of what was implemented
3) Any assumptions made
4) What I should configure next (DB URL, Auth secret, etc.)

Now implement this MVP.

---

## Implementation Log (updated as decisions are made)

### Setup Decisions
- **App directory**: `sportsdle/` (subdirectory of workspace root — npm naming forbids spaces/capitals)
- **Package manager**: npm
- **Auth**: NextAuth v4, credentials provider (email + password), JWT sessions — no PrismaAdapter
- **Theme**: Dark + vibrant
- **AdSense**: Stub/placeholder only (`AdSlot` component with dev guard)

### Tech Decisions
- **Database**: Neon PostgreSQL (`c-4` region). Standard TCP connections fail on this region — must use WebSocket driver.
- **Prisma driver**: `@prisma/adapter-neon` + `@neondatabase/serverless` WebSocket driver (not `@prisma/adapter-pg`)
- **Prisma 7**: `url` field not allowed in schema `datasource` block. Runtime connection configured via adapter; CLI connection via `prisma.config.ts` using `DIRECT_URL`.
- **Schema push**: `prisma db push` / `prisma migrate` cannot use WebSocket driver. Schema was pushed by generating SQL with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` and running it in Neon SQL Editor.
- **MC choices**: Generated server-side at page load (correct answer + 3 distractors from other questions of same sport, shuffled deterministically by `date+questionId`). Does NOT read from the DB `choices` column — bypasses potential array storage issues with Neon adapter.

### Gameplay Decisions
- **No mid-quiz reveal**: After submitting an answer, the app immediately advances to the next question pre-screen. Correct/incorrect is NOT shown until the final results screen.
- **Results screen**: Shows per-question breakdown with correct answers for anything wrong, plus what the user submitted.
- **Progress dots**: Neutral color for answered questions during quiz (no green/red until done screen).

### Environment (.env)
```
DATABASE_URL=   # pooled Neon URL (used by runtime app)
DIRECT_URL=     # direct Neon URL (used by Prisma CLI)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

### Current State
- DB: Seeded with 123 questions (30–31 per sport)
- Dev server: `npm run dev` in `sportsdle/` → http://localhost:3000
- GitHub: https://github.com/jacobotero/Sports-Trivia.git

### Key File Locations
- Schema: `sportsdle/prisma/schema.prisma`
- DB client: `sportsdle/lib/db.ts`
- Auth: `sportsdle/lib/auth.ts`
- Daily set + MC choices: `sportsdle/lib/daily.ts`
- Quiz UI: `sportsdle/components/QuizRunner.tsx`
- Play page (server): `sportsdle/app/play/[sport]/page.tsx`
- Seed: `sportsdle/prisma/seed.ts`
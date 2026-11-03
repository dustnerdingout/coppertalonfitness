# Copper Talon Fitness

A personal fitness tracker built for one goal: **lose fat, keep (and build) muscle**.
Track lifts, runs, weight, and food. The app tells you what weight to use next time and how far to run, so every week you get a little better.

Installable on your phone as a web app. Light and dark mode. All data stays on your device.

## What's inside

| Screen | What it does |
|---|---|
| **Home** | Today's sessions, trend weight and progress to goal, the week ahead, calories and protein left, quick log buttons |
| **Calendar** | Day, Week, and Month views of what's planned vs done, plus a full List of everything you've logged |
| **Progress** | Charts: consistency heatmap, sessions per week, weight trend, weekly loss, estimated max per lift, weekly volume, sets per muscle, PRs, run minutes, pace, effort, calories, protein, macro averages |
| **Food** | Log meals by Breakfast, Lunch, Dinner, Snack. Calorie ring and macro bars. One tap re-log of recent foods |
| **Settings** | Profile, theme, nutrition targets, lift rotation, weekly schedule, backup and restore |

### Default week
3 lifts, 3 runs, 1 mobility day, 1 full rest day (Monday doubles up with lift + easy run). Edit it any way you like in Settings.

### Lifting: body part focus
Pick a focus each workout: **Chest & Triceps, Back & Biceps, Legs & Core, Shoulders & Arms, Full Body**.
Each focus has slots, and each slot has a pool of variations.

- The **main lift** sticks so you can keep adding weight to it.
- The other slots **rotate automatically** to the variation you did least recently.
- **Mix it up** shuffles the accessories. **Swap** any single exercise. **Add** anything from the library.
- Rotation presets (Push/Pull/Legs, Full Body ×3, Upper/Lower/Full, PPL + Shoulders) decide which focus comes up next.

### Progression rules
- **Lifts (double progression):** every exercise has a rep range (like 8 to 12). Hit the top on every set and the weight goes up next time. Miss the bottom twice in a row at the same weight and it drops 10%.
- **Runs:** rate effort 1 to 10. Easy (6 or under) means about 10% more time next run. Hard (8+) repeats. Flag pain and it backs off 20%. Intervals add a round, then lengthen the run portion.
- **Weight:** a 7 day rolling average smooths out water weight. Pace is checked against 0.5% to 1% of body weight per week.
- **Food:** calories are estimated from height, age, and sex (Mifflin St Jeor) with a 20% deficit. Protein is 1 g per lb of goal weight. You can override everything.

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

## Deploy for free (Vercel, about 3 minutes)

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import the `coppertalonfitness` repo.
3. Vercel detects Vite automatically. Click **Deploy**.
4. Every push to the main branch redeploys on its own.

Netlify works the same way: build command `npm run build`, publish folder `dist`.

### Put it on your phone
Open the deployed URL in Safari, tap **Share**, then **Add to Home Screen**. It opens full screen like an app.

## Google sign in and cloud sync (Supabase)

Optional. Without it the app works fully offline on one device.

1. **Table:** in Supabase, open **SQL Editor > New query**, paste `supabase/schema.sql`, and click **Run**. It creates the `app_data` table with row level security so each person only sees their own data. Safe to run more than once.
2. **Google provider:** **Authentication > Sign In / Providers > Google** turned on, with your Google Cloud OAuth client ID and secret.
3. **Redirect URLs:** **Authentication > URL Configuration**. Set **Site URL** to your Vercel address, and add it under **Redirect URLs** (plus `http://localhost:5173` for local testing).
4. **Keys:** in Vercel, **Settings > Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`). Redeploy after adding them. For local dev, copy `.env.example` to `.env`.

How sync works: one row per user holds the whole app (minus the in-progress workout). Each device pulls, merges record by record (newest edit wins, deletions stick), and uploads. It syncs on sign in, 2 seconds after any change, when the app comes back into view, and every 30 seconds while open.

## Your data
Everything is saved in the browser's local storage on the device you use. Nothing is sent anywhere.
Use **Settings > Export backup** regularly, and **Import backup** to move to a new device.

## Tech
React 18 + Vite. No backend, no chart libraries (charts are hand built SVG).

```
src/
  lib/program.js      exercise library, body part focuses, rotations, schedule
  lib/progression.js  lift + run recommendations, session builder, swaps
  lib/plan.js         what's planned on any date
  lib/stats.js        weight trend math
  lib/nutrition.js    calorie + macro targets
  lib/store.jsx       local storage state
  components/         screens and UI pieces
```

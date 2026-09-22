# Ellendale Olympics — Fall '26 🏅

A real-time scoring site backed by Firebase Realtime Database. One repo, deployed
straight to GitHub Pages — no separate backend to host or pay for. Every device
watching the leaderboard updates live as the commissioner enters scores.

**Top 3 in the overall season standings are designated Draft Dogs Gold / Silver / Bronze Medalists**

---

## File Structure

```
ellendale-olympics/
├── index.html              # Home — hero, live podium, active event alert, standings preview
├── events.html             # All 6 events with descriptions, rules, live/final results
├── teams.html              # Public page showing fixed team pairings for the season
├── leaderboard.html        # Dual-mode: Current Event + Overall Standings
├── commissioner.html       # Login-protected: scoring, athlete roster, team management
├── athlete.html            # Individual athlete profile with live stats
├── css/
│   └── style.css           # Shared styling — dark navy + gold, teams, raw-value scoring UI
├── js/
│   ├── api.js               # ⚠️ Paste your Firebase config here — all data logic lives here
│   └── app.js               # Shared nav/footer/toast helpers + branding
├── img/
│   ├── favicon.png
│   └── logo.png
└── README.md                # This file
```

`js/api.js` works in two modes automatically:
- **Firebase mode** — once you paste in a real config, every page syncs live via
  Realtime Database listeners (no polling — instant updates).
- **Local mode** (fallback) — if the config is left blank, the site still runs
  using `localStorage` so you can test everything on one device before setting
  up Firebase. A blank/bad config can never crash the page.

The footer on every page shows which mode is active (🔥 Firebase or 💾 Local).

---

## 🔥 Firebase Setup (5 minutes)

### 1. Create a project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → name it (e.g. `ellendale-olympics`) → Continue
3. Disable Google Analytics (not needed) → **Create Project**

### 2. Create a Realtime Database
1. **Build → Realtime Database → Create Database**
2. Choose your region
3. **Start in test mode → Enable**

> ⚠️ Test mode allows anyone with the URL to read/write. That's fine for a floor
> event — see "Security note" below if you want to lock it down.

### 3. Get your config
1. **⚙ gear icon → Project settings**
2. Scroll to **Your apps → </> (Web)** → name it → **Register app**
3. Copy the `firebaseConfig` object

### 4. Paste it into the site
Open **`js/api.js`** and fill in the placeholder near the top:
```js
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "ellendale-olympics.firebaseapp.com",
  databaseURL: "https://ellendale-olympics-default-rtdb.firebaseio.com",
  projectId: "ellendale-olympics",
  storageBucket: "ellendale-olympics.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 5. Deploy to GitHub Pages
```bash
cd ellendale-olympics
git init && git add . && git commit -m "Ellendale Olympics — Fall '26"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
Then **Settings → Pages → Source: main branch, / (root) → Save**.

> If you're reusing the same GitHub Pages repo/URL as an earlier edition of this
> site, see "Upgrading from an older edition" below — there's one thing you
> need to know about browser-cached data.

---

## ⚠️ Upgrading from an older edition (same URL)

Browsers key `localStorage` by **origin**, not by which files are currently
deployed. If an earlier edition of this site (different event names, different
schema) was ever live at the same GitHub Pages URL, visitors' browsers may
still be holding onto that old data — and the app will load *that* instead of
reseeding fresh, showing stale event names, old athlete counts, "undefined"
labels, etc.

This build's storage key (`ellendale_v1_...`) is deliberately different from
any prior edition's, so a normal visit reseeds cleanly with the correct Fall
'26 events. If you still see stale data:
- Do a hard refresh (Cmd/Ctrl+Shift+R), or
- Open DevTools → Application → Local Storage → your site's origin → clear it

This is a one-time browser-cache thing, not a data-loss risk — Firebase (once
configured) is unaffected either way; only the local-mode fallback reads from
the browser's storage.

### Security note
The "commissioner" login (`commissioner` / `karamchutiyahai`) is a **UI gate only** —
it decides what buttons render in the browser, not who can write to Firebase.
Test-mode database rules let anyone with your database URL write directly via
the console. For a floor event this is a non-issue in practice, but if you want
real protection, go to **Realtime Database → Rules** and restrict writes —
that's a bigger change than this app currently does, so only bother if you're
worried about it.

---

## How It Works

### 🏅 Commissioner
1. **Commissioner** page → login (`commissioner` / `karamchutiyahai`)
2. **Athletes tab** → add the roster (first + last name)
3. **Teams tab** → pair up athletes into fixed teams (only unassigned athletes
   are selectable)
4. **Scoring tab** → pick an event, type in each athlete's/team's raw measurement
   - Placement and points compute live as you type
   - First score entered auto-starts the event ("Go Live")
   - **Conclude Event** locks in final results for everyone watching

### 👤 Athletes
- **My Profile** → login with first name (+ optional last name)
- See total points, medals, team, and per-event results — updates live
- Get a banner when an event they're part of is currently active

### 📊 Leaderboard (project this!)
- **Current Event** tab — live scores for whatever's active, or the last
  completed event
- **Overall Standings** tab — cumulative points across all 6 events, with a
  per-event breakdown table

### 🤝 Teams
- Public view of the season's fixed pairings, plus any athletes not yet on a team

---

## Fall '26 Events

| Event | Type | Metric | Wins By |
|---|---|---|---|
| 🙈 Gandhi ke 2 Bandar | Team | Time (seconds) | Lowest |
| 🎯 The Combine | Team | Time (seconds) | Lowest |
| ⛵ Paper Boat Creation | Team | Float time (seconds) | Highest |
| 🪂 Parachute Drop | Team | Fall time (seconds) | Highest |
| 💿 CD Slide | Team | Distance from edge (cm) | Lowest (DQ if it falls off) |
| 🎨 Pictionary | Team | Correct guesses | Highest |

All six events are team events — every athlete needs a fixed partner (Teams tab)
to be scored in any of them.

## Points System

| Place | Points | Overall Season Title |
|---|---|---|
| 1st | 10 | 🥇 Draft Dogs Gold Medalist |
| 2nd | 8  | 🥈 Draft Dogs Silver Medalist |
| 3rd | 6  | 🥉 Draft Dogs Bronze Medalist |
| 4th | 5  | — |
| 5th | 4  | — |
| 6th | 3  | — |
| 7th | 2  | — |
| 8th | 1  | — |

Every event is scored by team placement; both teammates earn the points.

## Tech Stack
- Vanilla HTML/CSS/JS — zero build step, zero dependencies beyond the Firebase SDK
- Firebase Realtime Database (free tier, loaded from CDN)
- GitHub Pages static hosting
- Real-time listeners — no polling, no manual sync, no share codes

---
Powered by Draft Dogs

# McMorrow 4th Floor Special Olympics 🏅

A live scoring and leaderboard website for the McMorrow Residential College 4th Floor Special Olympics. Powered by Firebase Realtime Database for instant cross-device updates.

**All events sponsored by Pranshu Foods Pvt Ltd**
**Event winners are designated Draft Dogs Gold / Silver / Bronze Medalists**

---

## File Structure

```
mcmorrow-olympics/
├── index.html              # Home page — hero, live podium, active event alert, athletes
├── events.html             # All 7 events with descriptions, rules, live/final results
├── leaderboard.html        # Dual-mode board: Current Event + Overall Standings
├── commissioner.html       # Login-protected scoring dashboard + athlete management
├── athlete.html            # Individual athlete profile with live stats
├── css/
│   └── style.css           # Global styles — dark navy + gold Olympic theme
├── js/
│   ├── db.js               # Firebase Realtime Database layer (⚠️ paste config here)
│   └── app.js              # Shared UI logic — nav, toasts, helpers, branding
├── img/
│   ├── favicon.png         # Draft Dogs logo (browser tab icon)
│   └── logo.png            # Draft Dogs logo (nav bar + footer branding)
└── README.md               # This file
```

---

## 🔥 Firebase Setup (5 minutes)

### 1. Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `mcmorrow-olympics`) → Continue
3. Disable Google Analytics (not needed) → **Create Project**

### 2. Create a Realtime Database
1. In the Firebase console, click **Build** → **Realtime Database**
2. Click **Create Database**
3. Choose your region (e.g. `us-central1`)
4. Select **Start in test mode** → **Enable**

> ⚠️ Test mode allows open read/write for 30 days. Fine for a short event.

### 3. Get Your Config
1. Click the **⚙ gear** icon → **Project settings**
2. Scroll down to **Your apps** → Click **</>** (Web)
3. Name it (e.g. `web`) → **Register app**
4. Copy the `firebaseConfig` object

### 4. Add Config to the Site
Open **`js/db.js`** and replace the placeholder at the top:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "mcmorrow-olympics.firebaseapp.com",
  databaseURL: "https://mcmorrow-olympics-default-rtdb.firebaseio.com",
  projectId: "mcmorrow-olympics",
  storageBucket: "mcmorrow-olympics.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 5. Deploy to GitHub Pages
1. Create a repo at [github.com/new](https://github.com/new) (make it **Public**)
2. Push the files:
```bash
cd mcmorrow-olympics
git init && git add . && git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mcmorrow-olympics.git
git push -u origin main
```
3. Go to **Settings** → **Pages** → Source: **main** branch, **/ (root)** → **Save**
4. Site live at: `https://YOUR_USERNAME.github.io/mcmorrow-olympics/`

---

## How It Works

### 🏅 Commissioner
1. Go to **Commissioner** page → Login (`commissioner` / `commissioner`)
2. **Add/remove athletes** via the athlete management panel
3. Select an event → Click **▶ Start Event (Go Live)**
4. Assign placements — **scores sync instantly to all devices**
5. Click **✅ Conclude Event** to finalize (everyone sees "Final Results")

### 👤 Athletes
1. Go to **My Profile** → Enter your first name
2. Stats, medals, and chart update **automatically in real-time**
3. Active events show a live alert with current placement
4. Top 3 earn the **Draft Dogs Gold / Silver / Bronze Medalist** title

### 📊 Leaderboard (project this on a big screen!)
- **Current Event** tab → live scores for the active event
- **Overall Standings** tab → cumulative leaderboard with per-event breakdown
- Everything updates instantly via Firebase — no refresh needed

### Event Flow
```
Commissioner starts event  →  "Live" banner on all screens
Commissioner enters scores →  leaderboard updates instantly everywhere
Commissioner concludes     →  "🏆 Final Results" + Draft Dogs Medalist titles shown
```

---

## Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `index.html` | Hero, live podium, active event alert, athlete grid |
| Events | `events.html` | All events: descriptions, rules, live/final results |
| Leaderboard | `leaderboard.html` | Dual-mode: Current Event + Overall Standings |
| Commissioner | `commissioner.html` | Scoring dashboard + athlete management (login required) |
| My Profile | `athlete.html` | Individual stats, medals, performance chart |

## Points System

| Place | Points | Title |
|-------|--------|-------|
| 1st   | 10     | 🥇 Draft Dogs Gold Medalist |
| 2nd   | 8      | 🥈 Draft Dogs Silver Medalist |
| 3rd   | 6      | 🥉 Draft Dogs Bronze Medalist |
| 4th   | 5      | — |
| 5th   | 4      | — |
| 6th   | 3      | — |
| 7th   | 2      | — |
| 8th   | 1      | — |

## Default Athletes
Akshay · Krish · Karam · Vardhan · Shaurya · Krishna · Giorgio · Liam

## Events
🏓 Indoor Pickleball · 🎳 Indoor Bowling (3 Frames) · 🏈 Football Skills Throw · 🏃 Drop the Ball and Run · ✈️ Paper Plane Throw · 💧 Water Pouring Challenge · 🥌 Curling

## Sponsorship
All events are proudly sponsored by **Pranshu Foods Pvt Ltd**.

## Tech Stack
- Vanilla HTML/CSS/JS (zero build step, zero dependencies)
- Firebase Realtime Database (free tier, loaded from CDN)
- GitHub Pages static hosting
- Real-time listeners — no polling, no manual sync
- Draft Dogs branding throughout

---

Built for McMorrow 4th Floor 🏆 | Sponsored by Pranshu Foods Pvt Ltd | Powered by Draft Dogs

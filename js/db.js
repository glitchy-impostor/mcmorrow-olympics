/**
 * McMorrow Olympics — Firebase Realtime Database Layer
 *
 * SETUP:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (disable Google Analytics if you want)
 * 3. Click "Realtime Database" → "Create Database"
 * 4. Choose region, start in TEST MODE
 * 5. Go to Project Settings → General → scroll down → "Add app" → Web (</>)
 * 6. Copy your config object and paste it into FIREBASE_CONFIG below
 */

// ============================================================
// ⬇️  PASTE YOUR FIREBASE CONFIG HERE  ⬇️
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAFgZmLomz0KJBjUrYT_PVLGoD9-HGM94c",
  authDomain: "mcmorrow-olympics.firebaseapp.com",
  projectId: "mcmorrow-olympics",
  storageBucket: "mcmorrow-olympics.firebasestorage.app",
  messagingSenderId: "1027101503735",
  appId: "1:1027101503735:web:a4f6ac287d78ba65e4a3f2"
};
// ============================================================

firebase.initializeApp(FIREBASE_CONFIG);
const rtdb = firebase.database();

const POINTS_TABLE = { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

const DEFAULT_ATHLETES = [
  { id: 'akshay',  firstName: 'Akshay',  lastName: '' },
  { id: 'krish',   firstName: 'Krish',   lastName: '' },
  { id: 'karam',   firstName: 'Karam',   lastName: '' },
  { id: 'vardhan', firstName: 'Vardhan', lastName: '' },
  { id: 'shaurya', firstName: 'Shaurya', lastName: '' },
  { id: 'krishna', firstName: 'Krishna', lastName: '' },
  { id: 'giorgio', firstName: 'Giorgio', lastName: '' },
  { id: 'liam',    firstName: 'Liam',    lastName: '' },
];

const DEFAULT_EVENTS = [
  { id: 'pickleball', name: 'Indoor Pickleball', icon: '🏓',
    description: 'A fast-paced indoor racquet sport combining elements of tennis, badminton, and table tennis.',
    rules: 'Standard pickleball rules. Games to 11, win by 2.', metric: 'Highest Score' },
  { id: 'bowling', name: 'Indoor Bowling (3 Frames)', icon: '🎳',
    description: 'Three frames of precision bowling. Every pin counts in this condensed format.',
    rules: 'Standard bowling scoring across 3 frames. Strikes and spares count.', metric: 'Highest Score' },
  { id: 'football_throw', name: 'Football Skills Throw', icon: '🏈',
    description: 'Precision football throws. Accuracy and distance determine the champion.',
    rules: 'Designated throws per competitor. Scored on accuracy and distance.', metric: 'Highest Score' },
  { id: 'drop_ball_run', name: 'Drop the Ball and Run', icon: '🏃',
    description: 'A test of reflexes and speed. Drop the ball and sprint.',
    rules: 'Ball dropped from set height. Sprint to finish. Fastest time wins.', metric: 'Fastest Time' },
  { id: 'paper_plane', name: 'Paper Plane Throw', icon: '✈️',
    description: 'Engineering meets athletics. Design and throw for maximum distance.',
    rules: 'Build and throw your plane. Longest distance wins.', metric: 'Greatest Distance' },
  { id: 'water_pour', name: 'Water Pouring Challenge', icon: '💧',
    description: 'Precision and steady hands. Pour water with surgical accuracy.',
    rules: 'Pour between containers. Least spillage wins.', metric: 'Highest Accuracy' },
  { id: 'curling', name: 'Curling', icon: '🥌',
    description: 'The roaring game comes indoors. Slide, sweep, and strategize.',
    rules: 'Indoor curling. Points by proximity to target.', metric: 'Highest Score' },
];

const DB = (() => {
  let _athletes = [];
  let _events = [];
  let _eventStatus = {};
  let _placements = {};
  let _ready = false;
  const _onReadyCallbacks = [];
  const _onChangeCallbacks = [];

  async function init() {
    const snap = await rtdb.ref('initialized').once('value');
    if (!snap.val()) await seed();
    _attachListeners();
  }

  async function seed() {
    const athleteMap = {};
    DEFAULT_ATHLETES.forEach(a => { athleteMap[a.id] = a; });
    const statusMap = {};
    DEFAULT_EVENTS.forEach(e => { statusMap[e.id] = 'upcoming'; });
    const eventMap = {};
    DEFAULT_EVENTS.forEach(e => { eventMap[e.id] = e; });
    await rtdb.ref().update({
      athletes: athleteMap, events: eventMap,
      event_status: statusMap, placements: {}, initialized: true,
    });
  }

  function _attachListeners() {
    const loaded = { a: false, e: false, s: false, p: false };
    function check() {
      if (loaded.a && loaded.e && loaded.s && loaded.p && !_ready) {
        _ready = true;
        _onReadyCallbacks.forEach(cb => cb());
      }
    }
    rtdb.ref('athletes').on('value', s => {
      _athletes = s.val() ? Object.values(s.val()) : [];
      loaded.a = true; check(); _fire();
    });
    rtdb.ref('events').on('value', s => {
      _events = s.val() ? Object.values(s.val()) : [...DEFAULT_EVENTS];
      loaded.e = true; check(); _fire();
    });
    rtdb.ref('event_status').on('value', s => {
      _eventStatus = s.val() || {};
      loaded.s = true; check(); _fire();
    });
    rtdb.ref('placements').on('value', s => {
      _placements = s.val() || {};
      loaded.p = true; check(); _fire();
    });
  }

  function _fire() { if (_ready) _onChangeCallbacks.forEach(cb => cb()); }
  function onReady(cb) { if (_ready) cb(); else _onReadyCallbacks.push(cb); }
  function onChange(cb) { _onChangeCallbacks.push(cb); }

  function getAthletes()    { return [..._athletes]; }
  function getEvents()      { return [..._events]; }
  function getEventStatus() { return { ..._eventStatus }; }

  // --- Athletes ---
  async function addAthlete(firstName, lastName) {
    const id = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
    const athlete = { id, firstName, lastName: lastName || '' };
    await rtdb.ref('athletes/' + id).set(athlete);
    return athlete;
  }
  async function removeAthlete(id) {
    await rtdb.ref('athletes/' + id).remove();
    // clean up placements
    const updates = {};
    Object.keys(_placements).forEach(eid => {
      if (_placements[eid] && _placements[eid][id] !== undefined)
        updates['placements/' + eid + '/' + id] = null;
    });
    if (Object.keys(updates).length) await rtdb.ref().update(updates);
  }

  // --- Events ---
  async function addEvent(ev) {
    await rtdb.ref('events/' + ev.id).set(ev);
    await rtdb.ref('event_status/' + ev.id).set('upcoming');
  }

  // --- Scoring ---
  async function setPlacement(eventId, athleteId, placement) {
    const ref = rtdb.ref('placements/' + eventId + '/' + athleteId);
    if (placement === null || placement === '' || placement === undefined) {
      await ref.remove();
    } else {
      await ref.set(parseInt(placement));
    }
  }
  async function setStatus(eventId, status) {
    await rtdb.ref('event_status/' + eventId).set(status);
  }
  async function concludeEvent(eventId) { await setStatus(eventId, 'completed'); }
  async function reopenEvent(eventId)   { await setStatus(eventId, 'active'); }
  async function clearEvent(eventId) {
    await rtdb.ref('placements/' + eventId).remove();
    await setStatus(eventId, 'upcoming');
  }

  // --- Computed ---
  function getEventPlacements(eventId) {
    const ep = _placements[eventId] || {};
    return Object.entries(ep)
      .map(([athleteId, placement]) => ({ athleteId, placement, points: POINTS_TABLE[placement] || 0 }))
      .sort((a, b) => a.placement - b.placement);
  }

  function getEventLeaderboard(eventId) {
    const ep = _placements[eventId] || {};
    return Object.entries(ep).map(([aid, p]) => {
      const ath = _athletes.find(a => a.id === aid);
      return { ...(ath || { id: aid, firstName: aid }), placement: p, points: POINTS_TABLE[p] || 0 };
    }).sort((a, b) => a.placement - b.placement);
  }

  function getStandings() {
    const standings = _athletes.map(a => {
      let totalPoints = 0, eventsCompleted = 0;
      const eventScores = {};
      _events.forEach(e => {
        const ep = _placements[e.id] || {};
        const placement = ep[a.id] || null;
        const points = placement ? (POINTS_TABLE[placement] || 0) : 0;
        eventScores[e.id] = { placement, points };
        totalPoints += points;
        if (placement) eventsCompleted++;
      });
      return { ...a, totalPoints, eventsCompleted, eventScores };
    });
    standings.sort((a, b) => b.totalPoints - a.totalPoints);
    standings.forEach((s, i) => {
      s.rank = (i > 0 && s.totalPoints === standings[i - 1].totalPoints) ? standings[i - 1].rank : i + 1;
    });
    return standings;
  }

  // --- Local auth ---
  function commissionerLogin(u, p) { return u === 'commissioner' && p === 'commissioner'; }
  function isCommissionerLoggedIn() { try { return localStorage.getItem('mcm_comm') === '1'; } catch { return false; } }
  function setCommissionerAuth(v)  { try { localStorage.setItem('mcm_comm', v ? '1' : '0'); } catch {} }
  function setCurrentAthlete(id)   { try { localStorage.setItem('mcm_ath', id); } catch {} }
  function getCurrentAthleteId()   { try { return localStorage.getItem('mcm_ath'); } catch { return null; } }
  function getCurrentAthlete() { const id = getCurrentAthleteId(); return id ? _athletes.find(a => a.id === id) || null : null; }
  function athleteLogout()         { try { localStorage.removeItem('mcm_ath'); } catch {} }

  async function resetAll() { await rtdb.ref().set(null); await seed(); }

  return {
    DEFAULT_EVENTS, POINTS_TABLE, init, onReady, onChange,
    getAthletes, getEvents, getEventStatus,
    addAthlete, removeAthlete, addEvent,
    setPlacement, setStatus, concludeEvent, reopenEvent, clearEvent,
    getEventPlacements, getEventLeaderboard, getStandings,
    commissionerLogin, isCommissionerLoggedIn, setCommissionerAuth,
    setCurrentAthlete, getCurrentAthleteId, getCurrentAthlete, athleteLogout,
    resetAll,
  };
})();

DB.init();

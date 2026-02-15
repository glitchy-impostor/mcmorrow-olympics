/**
 * McMorrow Olympics — Database Layer
 *
 * Works in two modes:
 *   1. FIREBASE MODE  — real-time sync across all devices (set config below)
 *   2. LOCAL MODE     — localStorage fallback, works immediately for testing
 *
 * FIREBASE SETUP:
 * 1. Go to https://console.firebase.google.com → Create project
 * 2. Build → Realtime Database → Create Database → Start in test mode
 * 3. Project Settings → Add Web App → Copy config below
 */

// ============================================================
// ⬇️  PASTE YOUR FIREBASE CONFIG HERE  ⬇️
// ============================================================
const firebaseConfig = { apiKey: "AIzaSyAFgZmLomz0KJBjUrYT_PVLGoD9-HGM94c", authDomain: "mcmorrow-olympics.firebaseapp.com", projectId: "mcmorrow-olympics", storageBucket: "mcmorrow-olympics.firebasestorage.app", messagingSenderId: "1027101503735", appId: "1:1027101503735:web:a4f6ac287d78ba65e4a3f2" };
// ============================================================

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

// ============================================================
// Detect if Firebase is available and properly configured
// ============================================================
function _isFirebaseConfigured() {
  return typeof firebase !== 'undefined' &&
         FIREBASE_CONFIG.apiKey &&
         FIREBASE_CONFIG.apiKey !== '' &&
         FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' &&
         FIREBASE_CONFIG.databaseURL &&
         FIREBASE_CONFIG.databaseURL !== '';
}

let _useFirebase = false;
let rtdb = null;

try {
  if (_isFirebaseConfigured()) {
    firebase.initializeApp(FIREBASE_CONFIG);
    rtdb = firebase.database();
    _useFirebase = true;
    console.log('%c[McMorrow] 🔥 Firebase connected — real-time sync active', 'color:#34D399;font-weight:bold;');
  } else {
    console.log('%c[McMorrow] 💾 Running in local mode (localStorage). Add Firebase config to js/db.js for real-time sync.', 'color:#F59E0B;font-weight:bold;');
  }
} catch (e) {
  console.warn('[McMorrow] Firebase init failed, falling back to local mode:', e.message);
  _useFirebase = false;
}

// ============================================================
// DB MODULE
// ============================================================
const DB = (() => {
  const LS_PREFIX = 'mcm_';

  // --- Cached state ---
  let _athletes = [];
  let _events = [...DEFAULT_EVENTS];
  let _eventStatus = {};
  let _placements = {};
  let _ready = false;
  const _onReadyCallbacks = [];
  const _onChangeCallbacks = [];

  // ===================== LOCAL STORAGE HELPERS =====================
  function _lsGet(key) {
    try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : null; } catch { return null; }
  }
  function _lsSet(key, val) {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
  }

  // ===================== INIT =====================
  async function init() {
    if (_useFirebase) {
      await _initFirebase();
    } else {
      _initLocal();
    }
  }

  // --- Firebase init ---
  async function _initFirebase() {
    const snap = await rtdb.ref('initialized').once('value');
    if (!snap.val()) await _seedFirebase();
    _attachFirebaseListeners();
  }

  async function _seedFirebase() {
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

  function _attachFirebaseListeners() {
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

  // --- Local init ---
  function _initLocal() {
    if (!_lsGet('initialized')) {
      _lsSet('athletes', DEFAULT_ATHLETES);
      const statusMap = {};
      DEFAULT_EVENTS.forEach(e => { statusMap[e.id] = 'upcoming'; });
      _lsSet('event_status', statusMap);
      _lsSet('events', DEFAULT_EVENTS);
      _lsSet('placements', {});
      _lsSet('initialized', true);
    }
    _loadLocal();
    _ready = true;
    setTimeout(() => {
      _onReadyCallbacks.forEach(cb => cb());
      _fire();
    }, 0);

    // Listen for cross-tab changes
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith(LS_PREFIX)) {
        _loadLocal();
        _fire();
      }
    });
  }

  function _loadLocal() {
    _athletes = _lsGet('athletes') || [...DEFAULT_ATHLETES];
    _events = _lsGet('events') || [...DEFAULT_EVENTS];
    _eventStatus = _lsGet('event_status') || {};
    _placements = _lsGet('placements') || {};
  }

  function _saveLocal() {
    _lsSet('athletes', _athletes);
    _lsSet('events', _events);
    _lsSet('event_status', _eventStatus);
    _lsSet('placements', _placements);
  }

  // --- Change notification ---
  function _fire() { if (_ready) _onChangeCallbacks.forEach(cb => cb()); }
  function onReady(cb) { if (_ready) cb(); else _onReadyCallbacks.push(cb); }
  function onChange(cb) { _onChangeCallbacks.push(cb); }

  // ===================== GETTERS =====================
  function getAthletes()    { return [..._athletes]; }
  function getEvents()      { return [..._events]; }
  function getEventStatus() { return { ..._eventStatus }; }
  function isFirebase()     { return _useFirebase; }

  // ===================== ATHLETES =====================
  async function addAthlete(firstName, lastName) {
    const id = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString(36);
    const athlete = { id, firstName, lastName: lastName || '' };
    if (_useFirebase) {
      await rtdb.ref('athletes/' + id).set(athlete);
    } else {
      _athletes.push(athlete);
      _saveLocal(); _fire();
    }
    return athlete;
  }

  async function removeAthlete(id) {
    if (_useFirebase) {
      await rtdb.ref('athletes/' + id).remove();
      const updates = {};
      Object.keys(_placements).forEach(eid => {
        if (_placements[eid] && _placements[eid][id] !== undefined)
          updates['placements/' + eid + '/' + id] = null;
      });
      if (Object.keys(updates).length) await rtdb.ref().update(updates);
    } else {
      _athletes = _athletes.filter(a => a.id !== id);
      Object.keys(_placements).forEach(eid => {
        if (_placements[eid]) delete _placements[eid][id];
      });
      _saveLocal(); _fire();
    }
  }

  // ===================== EVENTS =====================
  async function addEvent(ev) {
    if (_useFirebase) {
      await rtdb.ref('events/' + ev.id).set(ev);
      await rtdb.ref('event_status/' + ev.id).set('upcoming');
    } else {
      _events.push(ev);
      _eventStatus[ev.id] = 'upcoming';
      _saveLocal(); _fire();
    }
  }

  // ===================== SCORING =====================
  async function setPlacement(eventId, athleteId, placement) {
    if (_useFirebase) {
      const ref = rtdb.ref('placements/' + eventId + '/' + athleteId);
      if (placement === null || placement === '' || placement === undefined) {
        await ref.remove();
      } else {
        await ref.set(parseInt(placement));
      }
    } else {
      if (!_placements[eventId]) _placements[eventId] = {};
      if (placement === null || placement === '' || placement === undefined) {
        delete _placements[eventId][athleteId];
      } else {
        _placements[eventId][athleteId] = parseInt(placement);
      }
      _saveLocal(); _fire();
    }
  }

  async function setStatus(eventId, status) {
    if (_useFirebase) {
      await rtdb.ref('event_status/' + eventId).set(status);
    } else {
      _eventStatus[eventId] = status;
      _saveLocal(); _fire();
    }
  }

  async function concludeEvent(eventId) { await setStatus(eventId, 'completed'); }
  async function reopenEvent(eventId)   { await setStatus(eventId, 'active'); }

  async function clearEvent(eventId) {
    if (_useFirebase) {
      await rtdb.ref('placements/' + eventId).remove();
      await rtdb.ref('event_status/' + eventId).set('upcoming');
    } else {
      delete _placements[eventId];
      _eventStatus[eventId] = 'upcoming';
      _saveLocal(); _fire();
    }
  }

  // ===================== COMPUTED =====================
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
      return { ...(ath || { id: aid, firstName: aid, lastName: '' }), placement: p, points: POINTS_TABLE[p] || 0 };
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

  // ===================== AUTH (always local) =====================
  function commissionerLogin(u, p) { return u === 'commissioner' && p === 'commissioner'; }
  function isCommissionerLoggedIn() { try { return localStorage.getItem('mcm_comm') === '1'; } catch { return false; } }
  function setCommissionerAuth(v)  { try { localStorage.setItem('mcm_comm', v ? '1' : '0'); } catch {} }
  function setCurrentAthlete(id)   { try { localStorage.setItem('mcm_ath', id); } catch {} }
  function getCurrentAthleteId()   { try { return localStorage.getItem('mcm_ath'); } catch { return null; } }
  function getCurrentAthlete() {
    const id = getCurrentAthleteId();
    return id ? _athletes.find(a => a.id === id) || null : null;
  }
  function athleteLogout() { try { localStorage.removeItem('mcm_ath'); } catch {} }

  // ===================== RESET =====================
  async function resetAll() {
    if (_useFirebase) {
      await rtdb.ref().set(null);
      await _seedFirebase();
    } else {
      Object.keys(localStorage).forEach(k => { if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k); });
      _initLocal();
    }
  }

  return {
    DEFAULT_EVENTS, POINTS_TABLE, init, onReady, onChange, isFirebase,
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

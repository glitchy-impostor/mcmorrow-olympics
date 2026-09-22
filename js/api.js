/**
 * Ellendale Olympics — Fall '26
 * Firebase Realtime Database data layer.
 *
 * Same public interface as the Railway/FastAPI version (API.getAthletes,
 * API.setScore, etc.) so none of the HTML pages needed to change — only
 * this file's internals swapped from REST polling to Firebase listeners.
 *
 * SETUP:
 * 1. https://console.firebase.google.com → Create project
 * 2. Build → Realtime Database → Create Database → Start in test mode
 * 3. Project Settings → Add Web App → copy the config into FIREBASE_CONFIG below
 *
 * ⚠️ Test-mode rules allow anyone to read/write. The "commissioner" login
 * below is a client-side UI gate, not real security — anyone who opens dev
 * tools can write to the database directly. Fine for a fun floor event; if
 * you want real protection, lock down Realtime Database security rules
 * (see the README) before sharing the link outside your floor.
 */

// ============================================================
// ⬇️  PASTE YOUR FIREBASE CONFIG HERE  ⬇️
// ============================================================
const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
// ============================================================

const POINTS_TABLE = { 1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

const COMMISSIONER_USERNAME = "commissioner";
const COMMISSIONER_PASSWORD = "commissioner";

const DEFAULT_EVENTS = [
  {
    id: "gandhi_bandar",
    name: "Gandhi ke 2 Bandar",
    icon: "🙈",
    description: "A blindfolded teammate, holding the ball, must be guided across the room to drop it into a target — guided only by verbal directions shouted from a fixed corner by their partner, who is wearing noise-cancelling headphones and can hear but not be heard back.",
    rules: "One player is blindfolded and holds the ball. The other calls directions from a designated corner while wearing ANC headphones (one-way communication only). Clock starts on 'go' and stops when the ball lands in the target. Lowest time wins.",
    event_type: "team",
    metric_label: "Time (seconds)",
    direction: "asc",
    order_index: 1,
  },
  {
    id: "combine",
    name: "The Combine",
    icon: "🎯",
    description: "A 4-station relay testing every kind of throw and kick: bottle flip, mini football kick into a goal, American football throw into a target, and a frisbee field goal.",
    rules: "Two teammates alternate stations: (1) bottle flip, (2) kick mini football into goal, (3) throw American football into target, (4) frisbee field goal. A miss must be retried until it succeeds before moving on. Clock runs continuously across all 4 stations. Lowest total time wins.",
    event_type: "team",
    metric_label: "Time (seconds)",
    direction: "asc",
    order_index: 2,
  },
  {
    id: "paper_boat",
    name: "Paper Boat Creation",
    icon: "⛵",
    description: "Fold a seaworthy paper boat under time pressure, then set it afloat and see whose craftsmanship holds up longest before it sinks.",
    rules: "5 minutes to build a paper boat from a standard sheet of paper. Boats are then placed in water simultaneously. Longest time floating before sinking wins.",
    event_type: "individual",
    metric_label: "Float Time (seconds)",
    direction: "desc",
    order_index: 3,
  },
  {
    id: "parachute",
    name: "Parachute Drop",
    icon: "🪂",
    description: "Engineer a parachute that slows a falling object as much as possible — physics and material choice both matter here.",
    rules: "10 minutes to build a parachute. Dropped from a fixed height. Longest time to reach the ground wins.",
    event_type: "individual",
    metric_label: "Fall Time (seconds)",
    direction: "desc",
    order_index: 4,
  },
  {
    id: "cd_game",
    name: "CD Slide",
    icon: "💿",
    description: "A precision sliding game — send a CD skidding down the table and try to stop it as close to the far edge as possible without sending it over.",
    rules: "Two practice throws (untimed, unscored), then one final scored throw. Closest to the table's far edge without falling off wins. Falling off the table disqualifies that throw.",
    event_type: "individual",
    metric_label: "Distance from Edge (cm)",
    direction: "asc",
    order_index: 5,
  },
  {
    id: "pictionary",
    name: "Pictionary",
    icon: "🎨",
    description: "Classic team drawing-and-guessing game — sketch it out and rack up correct guesses before time runs out.",
    rules: "Standard Pictionary rules. Each team draws and guesses across a fixed number of rounds. Most correct guesses wins.",
    event_type: "team",
    metric_label: "Correct Guesses",
    direction: "desc",
    order_index: 6,
  },
];

// ============================================================
// Detect if Firebase is actually configured; fall back to
// localStorage if not, so a blank config never crashes the page.
// ============================================================
function _isFirebaseConfigured() {
  return typeof firebase !== 'undefined' &&
         FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== '' &&
         FIREBASE_CONFIG.databaseURL && FIREBASE_CONFIG.databaseURL !== '';
}

let _useFirebase = false;
let rtdb = null;

try {
  if (_isFirebaseConfigured()) {
    firebase.initializeApp(FIREBASE_CONFIG);
    rtdb = firebase.database();
    _useFirebase = true;
    console.log('%c[Ellendale] 🔥 Firebase connected — real-time sync active', 'color:#34D399;font-weight:bold;');
  } else {
    console.log('%c[Ellendale] 💾 Running in local mode (localStorage). Add Firebase config to js/api.js for real cross-device sync.', 'color:#F59E0B;font-weight:bold;');
  }
} catch (e) {
  console.warn('[Ellendale] Firebase init failed, falling back to local mode:', e.message);
  _useFirebase = false;
}

// ============================================================
// API MODULE
// ============================================================
const API = (() => {
  const LS_PREFIX = 'ellendale_v1_';

  let _athletes = [];
  let _teams = [];
  let _events = [];
  let _scores = {};   // { eventId: { participantId: { raw_value, disqualified } } }
  let _ready = false;
  let _lastError = null;

  const _onReadyCallbacks = [];
  const _onChangeCallbacks = [];
  const _onErrorCallbacks = [];

  function _genId(prefix) {
    const rand = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)).replace(/-/g, '');
    return `${prefix}_${rand.slice(0, 10)}`;
  }

  // ===================== LOCAL STORAGE FALLBACK =====================
  function _lsGet(key) {
    try { const v = localStorage.getItem(LS_PREFIX + key); return v ? JSON.parse(v) : null; } catch { return null; }
  }
  function _lsSet(key, val) { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); }

  function _initLocal() {
    if (!_lsGet('initialized')) {
      _lsSet('athletes', {});
      _lsSet('teams', {});
      const eventMap = {};
      DEFAULT_EVENTS.forEach(e => { eventMap[e.id] = { ...e, status: 'upcoming' }; });
      _lsSet('events', eventMap);
      _lsSet('scores', {});
      _lsSet('initialized', true);
    }
    _loadLocal();
    _ready = true;
    setTimeout(() => { _onReadyCallbacks.forEach(cb => cb()); _fire(); }, 0);
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith(LS_PREFIX)) { _loadLocal(); _fire(); }
    });
  }

  function _loadLocal() {
    _athletes = Object.values(_lsGet('athletes') || {});
    _teams = Object.values(_lsGet('teams') || {});
    _events = Object.values(_lsGet('events') || {}).sort((a, b) => (a.order_index||0) - (b.order_index||0));
    _scores = _lsGet('scores') || {};
  }

  function _localAthletesRef() { return _lsGet('athletes') || {}; }
  function _localTeamsRef() { return _lsGet('teams') || {}; }
  function _localEventsRef() { return _lsGet('events') || {}; }
  function _localScoresRef() { return _lsGet('scores') || {}; }

  // ===================== FIREBASE INIT =====================
  async function _initFirebase() {
    const snap = await rtdb.ref('initialized').once('value');
    if (!snap.val()) await _seedFirebase();
    _attachFirebaseListeners();
  }

  async function _seedFirebase() {
    const eventMap = {};
    DEFAULT_EVENTS.forEach(e => { eventMap[e.id] = { ...e, status: 'upcoming' }; });
    await rtdb.ref().update({
      athletes: {},
      teams: {},
      events: eventMap,
      scores: {},
      initialized: true,
    });
  }

  function _attachFirebaseListeners() {
    const loaded = { a: false, t: false, e: false, s: false };
    function check() {
      if (loaded.a && loaded.t && loaded.e && loaded.s && !_ready) {
        _ready = true;
        _onReadyCallbacks.forEach(cb => cb());
      }
    }
    rtdb.ref('athletes').on('value', snap => {
      _athletes = snap.val() ? Object.values(snap.val()) : [];
      loaded.a = true; check(); _fire();
    }, err => _handleFirebaseError(err));

    rtdb.ref('teams').on('value', snap => {
      const raw = snap.val() || {};
      _teams = Object.entries(raw).map(([id, t]) => ({ id, name: t.name, athlete_ids: t.athlete_ids || [] }));
      loaded.t = true; check(); _fire();
    }, err => _handleFirebaseError(err));

    rtdb.ref('events').on('value', snap => {
      const raw = snap.val();
      _events = raw ? Object.values(raw).sort((a, b) => (a.order_index||0) - (b.order_index||0)) : [...DEFAULT_EVENTS].map(e => ({ ...e, status: 'upcoming' }));
      loaded.e = true; check(); _fire();
    }, err => _handleFirebaseError(err));

    rtdb.ref('scores').on('value', snap => {
      _scores = snap.val() || {};
      loaded.s = true; check(); _fire();
    }, err => _handleFirebaseError(err));
  }

  function _handleFirebaseError(err) {
    _lastError = 'Firebase error: ' + (err.message || err) + ' — check your Realtime Database security rules.';
    _onErrorCallbacks.forEach(cb => cb(_lastError));
  }

  function _fire() { if (_ready) _onChangeCallbacks.forEach(cb => cb()); }
  function onReady(cb) { if (_ready) cb(); else _onReadyCallbacks.push(cb); }
  function onChange(cb) { _onChangeCallbacks.push(cb); }
  function onError(cb) { _onErrorCallbacks.push(cb); }

  async function init() {
    if (_useFirebase) {
      try {
        await _initFirebase();
        _lastError = null;
      } catch (e) {
        _lastError = 'Cannot reach Firebase — check FIREBASE_CONFIG in js/api.js and your database rules.';
        _onErrorCallbacks.forEach(cb => cb(_lastError));
        console.error('[Ellendale API] Firebase init failed:', e);
      }
    } else {
      _initLocal();
    }
  }

  // ===================== GETTERS =====================
  function getAthletes()  { return [..._athletes]; }
  function getTeams()     { return [..._teams]; }
  function getEvents()    { return [..._events]; }
  function getLastError() { return _lastError; }
  function isFirebase()   { return _useFirebase; }

  function getAthleteById(id) { return _athletes.find(a => a.id === id) || null; }
  function getTeamById(id)    { return _teams.find(t => t.id === id) || null; }
  function getTeamForAthlete(athleteId) {
    const a = getAthleteById(athleteId);
    return a && a.team_id ? getTeamById(a.team_id) : null;
  }

  // ===================== SCORING / RANKING (computed client-side) =====================
  function _rankEntries(entries, direction) {
    // entries: [{participant_id, raw_value, disqualified}]
    const scored = entries.filter(e => e.raw_value !== null && e.raw_value !== undefined && !e.disqualified);
    const unscored = entries.filter(e => e.raw_value === null || e.raw_value === undefined || e.disqualified);
    const reverse = direction === 'desc';
    scored.sort((a, b) => reverse ? b.raw_value - a.raw_value : a.raw_value - b.raw_value);
    const board = scored.map((e, i) => ({ ...e, placement: i + 1, points: POINTS_TABLE[i + 1] || 0 }));
    unscored.forEach(e => board.push({ ...e, placement: null, points: 0 }));
    return board;
  }

  function _rawScoresForEvent(eventId) {
    const raw = _scores[eventId] || {};
    return Object.entries(raw).map(([participantId, v]) => ({
      participant_id: participantId,
      raw_value: (v && v.raw_value !== undefined) ? v.raw_value : null,
      disqualified: !!(v && v.disqualified),
    }));
  }

  function getEventLeaderboard(eventId) {
    const event = _events.find(e => e.id === eventId);
    if (!event) return [];
    const entries = _rawScoresForEvent(eventId);
    const ranked = _rankEntries(entries, event.direction);
    return ranked.map(r => {
      if (event.event_type === 'team') {
        const team = getTeamById(r.participant_id);
        return { ...r, name: team ? team.name : r.participant_id, isTeam: true, team };
      } else {
        const ath = getAthleteById(r.participant_id);
        return { ...r, name: ath ? (ath.first_name + (ath.last_name ? ' ' + ath.last_name : '')) : r.participant_id, isTeam: false, athlete: ath };
      }
    }).sort((a, b) => {
      if (a.placement === null) return 1;
      if (b.placement === null) return -1;
      return a.placement - b.placement;
    });
  }

  function getStandings() {
    const totals = _athletes.map(a => {
      let totalPoints = 0, eventsCompleted = 0;
      const eventScores = {};
      _events.forEach(event => {
        const entries = _rawScoresForEvent(event.id);
        const ranked = _rankEntries(entries, event.direction);
        const map = {}; ranked.forEach(r => { map[r.participant_id] = r; });

        let entry = null;
        if (event.event_type === 'individual') {
          entry = map[a.id] || null;
        } else if (a.team_id) {
          entry = map[a.team_id] || null;
        }
        eventScores[event.id] = entry;
        if (entry && entry.placement) {
          totalPoints += entry.points;
          eventsCompleted++;
        }
      });
      return {
        id: a.id, first_name: a.first_name, last_name: a.last_name, team_id: a.team_id,
        total_points: totalPoints, events_completed: eventsCompleted, event_scores: eventScores,
      };
    });

    totals.sort((a, b) => b.total_points - a.total_points);
    let rank = 0, prevPoints = null;
    totals.forEach((s, i) => {
      if (s.total_points !== prevPoints) { rank = i + 1; prevPoints = s.total_points; }
      s.rank = rank;
    });
    return totals;
  }

  // ===================== AUTH =====================
  async function commissionerLogin(username, password) {
    if (username !== COMMISSIONER_USERNAME || password !== COMMISSIONER_PASSWORD) {
      throw new Error('Invalid credentials');
    }
    try { localStorage.setItem('ellendale_v1_comm', '1'); } catch {}
    return true;
  }
  function isCommissionerLoggedIn() { try { return localStorage.getItem('ellendale_v1_comm') === '1'; } catch { return false; } }
  function commissionerLogout() { try { localStorage.removeItem('ellendale_v1_comm'); } catch {} }

  async function athleteLogin(firstName, lastName) {
    const match = _athletes.find(a => a.first_name.toLowerCase() === firstName.trim().toLowerCase());
    if (!match) throw new Error('Athlete not found');
    try { localStorage.setItem('ellendale_v1_athlete_id', match.id); } catch {}
    return match;
  }
  function getCurrentAthleteId() { try { return localStorage.getItem('ellendale_v1_athlete_id'); } catch { return null; } }
  function getCurrentAthlete() { const id = getCurrentAthleteId(); return id ? getAthleteById(id) : null; }
  function athleteLogout() { try { localStorage.removeItem('ellendale_v1_athlete_id'); } catch {} }

  // ===================== ATHLETES =====================
  async function addAthlete(firstName, lastName) {
    const id = _genId('ath');
    const athlete = { id, first_name: firstName.trim(), last_name: (lastName || '').trim(), team_id: null };
    if (_useFirebase) {
      await rtdb.ref('athletes/' + id).set(athlete);
    } else {
      const all = _localAthletesRef(); all[id] = athlete; _lsSet('athletes', all); _loadLocal(); _fire();
    }
    return athlete;
  }

  async function removeAthlete(athleteId) {
    const athlete = getAthleteById(athleteId);
    if (_useFirebase) {
      const updates = { ['athletes/' + athleteId]: null };
      // Dissolve their team (a team needs exactly 2) and free the partner
      if (athlete && athlete.team_id) {
        const team = getTeamById(athlete.team_id);
        updates['teams/' + athlete.team_id] = null;
        if (team) {
          team.athlete_ids.filter(id => id !== athleteId).forEach(partnerId => {
            updates['athletes/' + partnerId + '/team_id'] = null;
          });
          // Clear that team's scores across all team events
          _events.filter(e => e.event_type === 'team').forEach(e => {
            updates['scores/' + e.id + '/' + athlete.team_id] = null;
          });
        }
      }
      // Clear this athlete's own individual scores
      _events.filter(e => e.event_type === 'individual').forEach(e => {
        updates['scores/' + e.id + '/' + athleteId] = null;
      });
      await rtdb.ref().update(updates);
    } else {
      const athletes = _localAthletesRef();
      const teams = _localTeamsRef();
      const scores = _localScoresRef();
      if (athlete && athlete.team_id && teams[athlete.team_id]) {
        const team = teams[athlete.team_id];
        (team.athlete_ids || []).filter(id => id !== athleteId).forEach(partnerId => {
          if (athletes[partnerId]) athletes[partnerId].team_id = null;
        });
        delete teams[athlete.team_id];
        _events.filter(e => e.event_type === 'team').forEach(e => {
          if (scores[e.id]) delete scores[e.id][athlete.team_id];
        });
      }
      _events.filter(e => e.event_type === 'individual').forEach(e => {
        if (scores[e.id]) delete scores[e.id][athleteId];
      });
      delete athletes[athleteId];
      _lsSet('athletes', athletes); _lsSet('teams', teams); _lsSet('scores', scores);
      _loadLocal(); _fire();
    }
  }

  // ===================== TEAMS =====================
  async function addTeam(name, athleteId1, athleteId2) {
    const a1 = getAthleteById(athleteId1);
    const a2 = getAthleteById(athleteId2);
    if (!a1 || !a2) throw new Error('One or both athletes not found');
    if (a1.team_id || a2.team_id) throw new Error('One or both athletes are already on a team');
    if (athleteId1 === athleteId2) throw new Error('Pick two different athletes');

    const id = _genId('team');
    const team = { id, name: name.trim(), athlete_ids: [athleteId1, athleteId2] };

    if (_useFirebase) {
      await rtdb.ref().update({
        ['teams/' + id]: team,
        ['athletes/' + athleteId1 + '/team_id']: id,
        ['athletes/' + athleteId2 + '/team_id']: id,
      });
    } else {
      const teams = _localTeamsRef(); teams[id] = team; _lsSet('teams', teams);
      const athletes = _localAthletesRef();
      athletes[athleteId1].team_id = id; athletes[athleteId2].team_id = id;
      _lsSet('athletes', athletes);
      _loadLocal(); _fire();
    }
    return team;
  }

  async function removeTeam(teamId) {
    const team = getTeamById(teamId);
    if (!team) throw new Error('Team not found');
    if (_useFirebase) {
      const updates = { ['teams/' + teamId]: null };
      team.athlete_ids.forEach(aid => { updates['athletes/' + aid + '/team_id'] = null; });
      _events.filter(e => e.event_type === 'team').forEach(e => {
        updates['scores/' + e.id + '/' + teamId] = null;
      });
      await rtdb.ref().update(updates);
    } else {
      const teams = _localTeamsRef();
      const athletes = _localAthletesRef();
      const scores = _localScoresRef();
      team.athlete_ids.forEach(aid => { if (athletes[aid]) athletes[aid].team_id = null; });
      delete teams[teamId];
      _events.filter(e => e.event_type === 'team').forEach(e => {
        if (scores[e.id]) delete scores[e.id][teamId];
      });
      _lsSet('teams', teams); _lsSet('athletes', athletes); _lsSet('scores', scores);
      _loadLocal(); _fire();
    }
  }

  // ===================== EVENT STATUS =====================
  async function setEventStatus(eventId, status) {
    if (_useFirebase) {
      await rtdb.ref('events/' + eventId + '/status').set(status);
    } else {
      const events = _localEventsRef();
      if (events[eventId]) events[eventId].status = status;
      _lsSet('events', events); _loadLocal(); _fire();
    }
  }

  // ===================== SCORES =====================
  async function setScore(eventId, participantId, rawValue, disqualified = false) {
    const clearing = (rawValue === null || rawValue === undefined) && !disqualified;
    if (_useFirebase) {
      const ref = rtdb.ref('scores/' + eventId + '/' + participantId);
      if (clearing) await ref.remove();
      else await ref.set({ raw_value: rawValue === undefined ? null : rawValue, disqualified: !!disqualified });
    } else {
      const scores = _localScoresRef();
      if (!scores[eventId]) scores[eventId] = {};
      if (clearing) delete scores[eventId][participantId];
      else scores[eventId][participantId] = { raw_value: rawValue === undefined ? null : rawValue, disqualified: !!disqualified };
      _lsSet('scores', scores); _loadLocal(); _fire();
    }
  }

  async function clearEventScores(eventId) {
    if (_useFirebase) {
      await rtdb.ref().update({
        ['scores/' + eventId]: null,
        ['events/' + eventId + '/status']: 'upcoming',
      });
    } else {
      const scores = _localScoresRef();
      delete scores[eventId];
      const events = _localEventsRef();
      if (events[eventId]) events[eventId].status = 'upcoming';
      _lsSet('scores', scores); _lsSet('events', events);
      _loadLocal(); _fire();
    }
  }

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

  // ===================== HELPERS =====================
  function getMedalistTitle(rank) {
    if (rank === 1) return 'Draft Dogs Gold Medalist';
    if (rank === 2) return 'Draft Dogs Silver Medalist';
    if (rank === 3) return 'Draft Dogs Bronze Medalist';
    return '';
  }
  function getMedalEmoji(rank) { return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''; }
  function getStatusLabel(s) { return { upcoming: 'Upcoming', active: 'In Progress', completed: 'Completed' }[s] || s; }

  return {
    POINTS_TABLE, init, onReady, onChange, onError, isFirebase,
    getAthletes, getTeams, getEvents, getStandings, getLastError,
    getAthleteById, getTeamById, getTeamForAthlete, getEventLeaderboard,
    commissionerLogin, isCommissionerLoggedIn, commissionerLogout,
    athleteLogin, getCurrentAthleteId, getCurrentAthlete, athleteLogout,
    addAthlete, removeAthlete, addTeam, removeTeam,
    setEventStatus, setScore, clearEventScores, resetAll,
    getMedalistTitle, getMedalEmoji, getStatusLabel,
  };
})();

API.init();

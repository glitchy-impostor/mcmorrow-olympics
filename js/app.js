const App = (() => {

  function getNavHTML(activePage) {
    const pages = [
      { id: 'home',         href: 'index.html',        label: 'Home' },
      { id: 'events',       href: 'events.html',       label: 'Events' },
      { id: 'teams',        href: 'teams.html',        label: 'Teams' },
      { id: 'leaderboard',  href: 'leaderboard.html',  label: 'Leaderboard' },
      { id: 'athlete',      href: 'athlete.html',      label: 'My Profile' },
      { id: 'commissioner', href: 'commissioner.html',  label: 'Commissioner' },
    ];
    const athlete = API.getCurrentAthlete();
    const isComm = API.isCommissionerLoggedIn();
    let userHTML = '';
    if (isComm) {
      userHTML = `<span class="nav-user-name">🏅 Commissioner</span>
        <button class="btn btn-sm btn-outline" onclick="App.logoutCommissioner()">Logout</button>`;
    } else if (athlete) {
      userHTML = `<span class="nav-user-name">👤 ${athlete.first_name}</span>
        <button class="btn btn-sm btn-outline" onclick="App.logoutAthlete()">Logout</button>`;
    }
    return `
    <nav class="nav">
      <div class="nav-inner">
        <a class="nav-brand" href="index.html">
          <img src="img/logo.png" alt="Draft Dogs" style="height:36px;width:auto;">
          <span class="nav-brand-text">McMorrow Olympics</span>
        </a>
        <ul class="nav-links" id="navLinks">
          ${pages.map(p => `<li><a href="${p.href}" class="${activePage === p.id ? 'active' : ''}">${p.label}</a></li>`).join('')}
        </ul>
        <div class="nav-user">${userHTML}</div>
        <button class="nav-hamburger" onclick="App.toggleNav()">☰</button>
      </div>
    </nav>`;
  }

  function getFooterHTML() {
    return `<footer class="footer"><div class="container">
      <p><span class="footer-brand">McMorrow 4th Floor Special Olympics — Fall '26</span></p>
      <p style="margin-top:8px;font-size:12px;color:var(--text-dim);">Sponsored by <strong style="color:var(--gold);">Pranshu Foods Pvt Ltd</strong></p>
      <p style="margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;">
        <img src="img/logo.png" alt="Draft Dogs" style="height:24px;width:auto;opacity:0.7;">
        <span style="font-size:11px;color:var(--text-dim);">Powered by Draft Dogs</span>
      </p>
      <p style="margin-top:8px;font-size:10px;color:var(--text-dim);opacity:0.5;" id="connStatus">Connecting to backend...</p>
    </div></footer>`;
  }

  function renderNav(p)    { document.getElementById('nav-mount').innerHTML = getNavHTML(p); }
  function renderFooter()  {
    const el = document.getElementById('footer-mount');
    if (!el) return;
    el.innerHTML = getFooterHTML();
    updateConnStatus();
    API.onChange(updateConnStatus);
    API.onError(updateConnStatus);
  }
  function updateConnStatus() {
    const el = document.getElementById('connStatus');
    if (!el) return;
    const err = API.getLastError();
    if (err) {
      el.textContent = '⚠ ' + err;
      el.style.color = 'var(--red)';
    } else if (API.isFirebase()) {
      el.textContent = '🔥 Firebase — real-time sync active';
      el.style.color = 'var(--text-dim)';
    } else {
      el.textContent = '💾 Local mode — add Firebase config in js/api.js for cross-device sync';
      el.style.color = 'var(--text-dim)';
    }
  }
  function toggleNav() { document.getElementById('navLinks').classList.toggle('open'); }

  function toast(msg, type = 'success') {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
  }

  function logoutAthlete()     { API.athleteLogout(); window.location.href = 'athlete.html'; }
  function logoutCommissioner(){ API.commissionerLogout(); window.location.href = 'commissioner.html'; }

  function getStatusLabel(s) { return API.getStatusLabel(s); }
  function getMedalEmoji(r)  { return API.getMedalEmoji(r); }
  function getMedalistTitle(r) { return API.getMedalistTitle(r); }

  function fmtValue(val, event) {
    if (val === null || val === undefined) return '—';
    const label = (event.metric_label || '').toLowerCase();
    if (label.includes('time')) return val + 's';
    if (label.includes('cm') || label.includes('distance')) return val + 'cm';
    return val;
  }

  function directionHint(event) {
    return event.direction === 'asc' ? 'Lowest wins' : 'Highest wins';
  }

  return {
    renderNav, renderFooter, toggleNav, toast,
    logoutAthlete, logoutCommissioner,
    getStatusLabel, getMedalEmoji, getMedalistTitle,
    fmtValue, directionHint,
  };
})();

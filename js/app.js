const App = (() => {

  function getNavHTML(activePage) {
    const pages = [
      { id: 'home',         href: 'index.html',        label: 'Home' },
      { id: 'events',       href: 'events.html',       label: 'Events' },
      { id: 'leaderboard',  href: 'leaderboard.html',  label: 'Leaderboard' },
      { id: 'athlete',      href: 'athlete.html',      label: 'My Profile' },
      { id: 'commissioner', href: 'commissioner.html',  label: 'Commissioner' },
    ];
    const athlete = DB.getCurrentAthlete();
    const isComm = DB.isCommissionerLoggedIn();
    let userHTML = '';
    if (isComm) {
      userHTML = `<span class="nav-user-name">🏅 Commissioner</span>
        <button class="btn btn-sm btn-outline" onclick="App.logoutCommissioner()">Logout</button>`;
    } else if (athlete) {
      userHTML = `<span class="nav-user-name">👤 ${athlete.firstName}</span>
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
      <p><span class="footer-brand">McMorrow 4th Floor Special Olympics</span></p>
      <p style="margin-top:8px;font-size:12px;color:var(--text-dim);">Sponsored by <strong style="color:var(--gold);">Pranshu Foods Pvt Ltd</strong></p>
      <p style="margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;">
        <img src="img/logo.png" alt="Draft Dogs" style="height:24px;width:auto;opacity:0.7;">
        <span style="font-size:11px;color:var(--text-dim);">Powered by Draft Dogs</span>
      </p>
    </div></footer>`;
  }

  function renderNav(p)    { document.getElementById('nav-mount').innerHTML = getNavHTML(p); }
  function renderFooter()  { const el = document.getElementById('footer-mount'); if (el) el.innerHTML = getFooterHTML(); }
  function toggleNav()     { document.getElementById('navLinks').classList.toggle('open'); }

  function toast(msg, type = 'success') {
    const old = document.querySelector('.toast'); if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3000);
  }

  function logoutAthlete()     { DB.athleteLogout(); window.location.href = 'athlete.html'; }
  function logoutCommissioner(){ DB.setCommissionerAuth(false); window.location.href = 'commissioner.html'; }

  function getPlacementLabel(p) {
    if (!p) return '—';
    return p + (['st','nd','rd'][p-1] || 'th');
  }
  function getPlacementClass(p) {
    if (!p) return 'p-none';
    return p <= 3 ? 'p' + p : 'p-other';
  }
  function getMedalEmoji(r) { return r===1?'🥇':r===2?'🥈':r===3?'🥉':''; }
  function getMedalistTitle(r) {
    if (r === 1) return 'Draft Dogs Gold Medalist';
    if (r === 2) return 'Draft Dogs Silver Medalist';
    if (r === 3) return 'Draft Dogs Bronze Medalist';
    return '';
  }
  function getStatusLabel(s) { return { upcoming:'Upcoming', active:'In Progress', completed:'Completed' }[s] || s; }

  return {
    renderNav, renderFooter, toggleNav, toast,
    logoutAthlete, logoutCommissioner,
    getPlacementLabel, getPlacementClass, getMedalEmoji, getMedalistTitle, getStatusLabel,
  };
})();

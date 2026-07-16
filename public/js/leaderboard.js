// ==================== Leaderboard (via backend proxy, never talks to Supabase directly) ====================

let cachedLeaderboard = [];
let cachedMyRank = null; // { rank, score } for the current user, if not in top 100

async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard?username=' + encodeURIComponent(currentUsername || ''));
    const data = await res.json();
    cachedLeaderboard = Array.isArray(data.top) ? data.top : [];
    cachedMyRank = data.me || null;
  } catch (err) {
    cachedLeaderboard = [];
    cachedMyRank = null;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function rankClass(i) {
  if (i === 0) return 'top1';
  if (i === 1) return 'top2';
  if (i === 2) return 'top3';
  return '';
}

function renderLeaderboardModal() {
  if (cachedLeaderboard.length === 0) {
    lbFullList.innerHTML = '<li class="empty">No scores yet. Be the first!</li>';
    lbYouRow.style.display = 'none';
    return;
  }
  lbFullList.innerHTML = cachedLeaderboard.map((r, i) => {
    const flag = COUNTRY_FLAG[r.country] || '\ud83c\udf10';
    return `<li class="${rankClass(i)}" style="animation-delay:${Math.min(i,20)*0.02}s"><span class="rank">#${i+1}</span><span class="flag">${flag}</span><span class="uname">${escapeHtml(r.username)}</span><span class="uscore">${r.score}</span></li>`;
  }).join('');

  if (currentUsername) {
    const key = currentUsername.toLowerCase();
    const idxInTop = cachedLeaderboard.findIndex(r => r.username.toLowerCase() === key);
    if (idxInTop >= 0) {
      const r = cachedLeaderboard[idxInTop];
      const flag = COUNTRY_FLAG[r.country] || '\ud83c\udf10';
      lbYouRow.innerHTML = `<span class="rank">#${idxInTop+1}</span><span class="flag">${flag}</span><span class="uname">${escapeHtml(r.username)} (you)</span><span class="uscore">${r.score}</span>`;
      lbYouRow.style.display = 'flex';
    } else if (cachedMyRank) {
      const flag = COUNTRY_FLAG[cachedMyRank.country] || '\ud83c\udf10';
      lbYouRow.innerHTML = `<span class="rank">#${cachedMyRank.rank}</span><span class="flag">${flag}</span><span class="uname">${escapeHtml(currentUsername)} (you)</span><span class="uscore">${cachedMyRank.score}</span>`;
      lbYouRow.style.display = 'flex';
    } else {
      lbYouRow.innerHTML = `<span class="uname">You haven't set a score yet</span>`;
      lbYouRow.style.display = 'flex';
    }
  } else {
    lbYouRow.style.display = 'none';
  }
}

async function openLeaderboard() {
  lbFullList.innerHTML = '<li class="empty">Loading...</li>';
  lbYouRow.style.display = 'none';
  lbModal.classList.add('show');
  await fetchLeaderboard();
  renderLeaderboardModal();
}

viewLeaderboardBtn.addEventListener('click', openLeaderboard);
lbCloseBtn.addEventListener('click', () => { lbModal.classList.remove('show'); });

// Connect Wallet: disabled placeholder, coming soon
connectWalletBtn.addEventListener('click', (e) => { e.preventDefault(); });

async function submitScore(username, finalScore) {
  try {
    await fetch('/api/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        score: finalScore,
        country: currentCountry,
        initData: (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp.initData : ''
      })
    });
    fetchLeaderboard();
  } catch (err) {
    // silent fail - don't block gameplay if leaderboard submit fails
  }
}

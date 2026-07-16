// ==================== Daily Streak / XP (separate from in-game score, display-only) ====================

let currentStreak = { days: 0, xp: 0 };

async function fetchStreak() {
  try {
    const initData = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp.initData : '';
    const res = await fetch('/api/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    });
    const data = await res.json();
    if (data && typeof data.days === 'number') {
      currentStreak = { days: data.days, xp: data.xp };
      renderStreak();
    }
  } catch (err) {
    // silent fail - streak display is non-critical
  }
}

function renderStreak() {
  if (!streakBox) return;
  streakBox.textContent = '\ud83d\udd25 Day ' + currentStreak.days + ' \u00b7 ' + currentStreak.xp + ' XP';
  streakBox.style.display = 'block';
}

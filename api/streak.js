// POST /api/streak
// Validates the Telegram session, then reads/updates the user's daily play streak + XP.
// XP here is a separate display-only counter from in-game score (per product decision).
const { createClient } = require('@supabase/supabase-js');
const { verifyTelegramInitData } = require('./_lib/verifyTelegram');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STREAK_XP_TABLE = [10, 15, 20, 25, 30, 35, 40]; // day 1..7+, day 7+ caps at 40

function xpForDay(day) {
  const idx = Math.min(day, STREAK_XP_TABLE.length) - 1;
  return STREAK_XP_TABLE[Math.max(0, idx)];
}

function daysBetween(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((utcB - utcA) / msPerDay);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { initData } = req.body || {};
    const tgUser = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!tgUser || !tgUser.id) {
      res.status(401).json({ error: 'Unauthorized: invalid Telegram session' });
      return;
    }

    const telegramId = String(tgUser.id);
    const today = new Date();

    const { data: existing } = await supabase
      .from('streaks')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    let days, totalXp;

    if (!existing) {
      days = 1;
      totalXp = xpForDay(1);
      await supabase.from('streaks').insert({
        telegram_id: telegramId,
        days,
        total_xp: totalXp,
        last_play_date: today.toISOString().slice(0, 10)
      });
    } else {
      const lastPlay = new Date(existing.last_play_date + 'T00:00:00Z');
      const diff = daysBetween(lastPlay, today);

      if (diff === 0) {
        // already played today, no change
        days = existing.days;
        totalXp = existing.total_xp;
      } else if (diff === 1) {
        // consecutive day, streak continues
        days = existing.days + 1;
        totalXp = existing.total_xp + xpForDay(days);
        await supabase.from('streaks').update({
          days, total_xp: totalXp, last_play_date: today.toISOString().slice(0, 10)
        }).eq('telegram_id', telegramId);
      } else {
        // missed a day (or more), streak resets to day 1
        days = 1;
        totalXp = existing.total_xp + xpForDay(1);
        await supabase.from('streaks').update({
          days, total_xp: totalXp, last_play_date: today.toISOString().slice(0, 10)
        }).eq('telegram_id', telegramId);
      }
    }

    res.status(200).json({ days, xp: totalXp });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update streak' });
  }
};

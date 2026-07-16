// POST /api/submit-score
// Validates the request came from a real Telegram user, rate-limits by IP,
// sanity-checks the score against plausible human play time, then inserts
// using the SERVICE key (never exposed to the client).
const { createClient } = require('@supabase/supabase-js');
const { verifyTelegramInitData } = require('./_lib/verifyTelegram');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service_role key: server-side only, full write access
);

const MIN_SECONDS_PER_POINT = 0.35; // fastest plausible time to clear one pipe gap
const RATE_LIMIT_WINDOW_SECONDS = 8; // min seconds between submissions from the same IP

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { username, score, country, initData } = req.body || {};

    if (typeof username !== 'string' || !username.trim() || username.length > 20) {
      res.status(400).json({ error: 'Invalid username' });
      return;
    }
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100000) {
      res.status(400).json({ error: 'Invalid score' });
      return;
    }

    // 1. Verify this request really came from Telegram (signature check)
    const tgUser = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
    if (!tgUser || !tgUser.id) {
      res.status(401).json({ error: 'Unauthorized: invalid Telegram session' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

    // 2. Rate-limit by IP (stored in Supabase since serverless functions are stateless)
    const { data: rl } = await supabase
      .from('rate_limits')
      .select('last_submit')
      .eq('ip', ip)
      .maybeSingle();

    const now = Date.now();
    if (rl && now - new Date(rl.last_submit).getTime() < RATE_LIMIT_WINDOW_SECONDS * 1000) {
      res.status(429).json({ error: 'Too many requests, slow down' });
      return;
    }
    await supabase.from('rate_limits').upsert({ ip, last_submit: new Date(now).toISOString() });

    // 3. Rate-limit + plausibility by Telegram user id too (not just IP)
    const { data: lastRow } = await supabase
      .from('leaderboard')
      .select('created_at')
      .eq('telegram_id', String(tgUser.id))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRow) {
      const elapsedSeconds = (now - new Date(lastRow.created_at).getTime()) / 1000;
      const minPlausibleSeconds = score * MIN_SECONDS_PER_POINT;
      if (elapsedSeconds < minPlausibleSeconds * 0.5) {
        // submitted way faster than humanly possible for this score vs last submission
        res.status(400).json({ error: 'Score rejected: implausible submission speed' });
        return;
      }
    }

    // 4. Insert using the service key (never exposed to client)
    const { error: insertError } = await supabase.from('leaderboard').insert({
      username: username.trim().slice(0, 20),
      score: Math.floor(score),
      country: typeof country === 'string' ? country.slice(0, 10) : 'OTHER',
      telegram_id: String(tgUser.id)
    });

    if (insertError) throw insertError;

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit score' });
  }
};

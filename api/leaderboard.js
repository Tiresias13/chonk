// GET /api/leaderboard?username=xxx
// Read-only proxy to Supabase. Returns top 100 (deduped by best score per user)
// plus the requesting user's own rank if they're outside the top 100.
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // anon/read-only key is fine here, RLS should restrict to SELECT only
);

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { data: rows, error } = await supabase
      .from('leaderboard')
      .select('username, score, country')
      .order('score', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // dedupe by username, keep best score
    const bestByUser = new Map();
    for (const r of rows) {
      const key = r.username.toLowerCase();
      if (!bestByUser.has(key) || r.score > bestByUser.get(key).score) {
        bestByUser.set(key, r);
      }
    }
    const sorted = [...bestByUser.values()].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, 100);

    let me = null;
    const username = (req.query.username || '').toLowerCase();
    if (username) {
      const idx = sorted.findIndex(r => r.username.toLowerCase() === username);
      if (idx >= 100) {
        me = { rank: idx + 1, score: sorted[idx].score, country: sorted[idx].country };
      }
    }

    res.status(200).json({ top, me });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
};

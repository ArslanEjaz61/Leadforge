import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { action, text } = req.body || {};
  let update = {};
  if (action === 'approve') update = { status: 'approved', reviewed_at: new Date().toISOString() };
  else if (action === 'reject') update = { status: 'rejected', reviewed_at: new Date().toISOString() };
  else if (action === 'edit') update = { edited_text: text };
  else return res.status(400).json({ error: 'Unknown action' });

  const { data, error } = await supabase.from('comments').update(update).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });

  // On approve, immediately post it to LinkedIn (no separate manual step).
  if (action === 'approve') {
    try {
      const r = await fetch(`${process.env.N8N_BASE_URL}/morango-post-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: id }),
      });
      const postResult = await r.json().catch(() => ({}));
      // Read back the fresh status to tell the UI what really happened.
      const { data: fresh } = await supabase.from('comments').select('status').eq('id', id).single();
      const posted = fresh?.status === 'posted';
      return res.status(200).json({
        ok: true,
        posted,
        message: posted
          ? 'Comment posted to LinkedIn ✓'
          : (postResult.message || 'Approved, but not posted yet (check posting window / daily cap in Settings).'),
        data,
      });
    } catch (e) {
      return res.status(200).json({ ok: true, posted: false, message: 'Approved, but posting failed: ' + String(e), data });
    }
  }

  res.status(200).json({ ok: true, data });
}

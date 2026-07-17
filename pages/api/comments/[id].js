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
  res.status(200).json({ ok: true, data });
}

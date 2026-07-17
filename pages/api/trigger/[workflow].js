// Proxies a button click in the CRM to the matching n8n webhook.
const WORKFLOW_PATHS = {
  search: 'morango-lead-search',
  qualify: 'morango-qualify-leads',
  'fetch-posts': 'morango-fetch-posts',
  evaluate: 'morango-evaluate-posts',
  'post-comments': 'morango-post-comments',
  'detect-replies': 'morango-detect-replies',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { workflow } = req.query;
  const path = WORKFLOW_PATHS[workflow];
  if (!path) return res.status(400).json({ error: 'Unknown workflow: ' + workflow });

  try {
    const r = await fetch(`${process.env.N8N_BASE_URL}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const data = await r.json().catch(() => ({}));
    res.status(r.ok ? 200 : 502).json(data);
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
}

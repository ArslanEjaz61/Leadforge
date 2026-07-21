import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import TourGuide from '../components/TourGuide';
import PipelineStepper from '../components/PipelineStepper';

const TABS = ['all', 'pending', 'approved', 'posted', 'rejected'];

const TOUR_STEPS = [
  {
    selector: '#tour-pipeline-buttons',
    title: 'Step 4 — Draft & Post',
    description: '"Evaluate & Draft Comments" has the AI read fetched posts and write comment drafts. "Post Approved Comments" sends whatever you\'ve approved live to LinkedIn.',
  },
  {
    selector: '#tour-tabs',
    title: 'Filter by Status',
    description: 'Filter comments by status — Pending (waiting for review), Approved, Posted, or Rejected.',
  },
  {
    selector: '#tour-first-comment',
    title: 'Comment Card',
    description: 'Each card shows: the lead\'s name, their original post (top), and the AI-drafted comment (below, highlighted). Read it to check it sounds genuine.',
  },
  {
    selector: '#tour-comment-actions',
    title: 'Approve or Reject',
    description: 'Like the comment? Approve it — it\'ll go out next time "Post Approved Comments" runs. Don\'t like it? Reject it.',
  },
];

export async function getServerSideProps({ query }) {
  const tab = TABS.includes(query.tab) ? query.tab : 'pending';
  let q = supabase
    .from('comments')
    .select('id,drafted_text,edited_text,outreach_hook,status,failure_reason,created_at,leads(full_name,industry,linkedin_profile_url),posts(content,linkedin_post_urn)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (tab !== 'all') q = q.eq('status', tab);
  const { data, error } = await q;
  return { props: { comments: data || [], tab, error: error ? error.message : null } };
}

function pillClass(status) {
  return { pending: 'pill-amber', approved: 'pill-blue', posted: 'pill-green', rejected: 'pill-red', failed: 'pill-red' }[status] || 'pill-gray';
}

// Build a viewable LinkedIn URL from a stored post URN (urn:li:activity:… / urn:li:ugcPost:…)
function postUrl(c) {
  const urn = c.posts?.linkedin_post_urn;
  if (urn) {
    const clean = urn.startsWith('urn:li:') ? urn : `urn:li:activity:${urn}`;
    return `https://www.linkedin.com/feed/update/${clean}`;
  }
  return c.leads?.linkedin_profile_url || null; // fallback: the lead's profile
}

const PIPELINE_ACTIONS = [
  { key: 'evaluate', label: 'Evaluate & Draft Comments' },
  { key: 'post-comments', label: 'Post Approved Comments' },
];

export default function CommentsReview({ comments, tab }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [running, setRunning] = useState(null);
  const [message, setMessage] = useState(null);

  async function act(id, action, leadName) {
    setBusyId(id);
    setMessage(null);
    try {
      const r = await fetch(`/api/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) throw new Error('Request failed');
      const label = action === 'approve' ? 'Approved ✓' : 'Rejected';
      setMessage(`${label} — ${leadName || 'lead'}'s comment${action === 'approve' ? '. It will post next time you run “Post Approved Comments”.' : '.'}`);
    } catch (e) {
      setMessage('Could not update comment: ' + String(e.message || e));
    } finally {
      setBusyId(null);
      setTimeout(() => router.replace(router.asPath), 900);
    }
  }

  async function runPipelineAction(action) {
    setRunning(action.key);
    setMessage(null);
    try {
      const r = await fetch(`/api/trigger/${action.key}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await r.json();
      setMessage(data.message || (data.ok ? 'Done' : 'Something went wrong'));
    } catch (e) {
      setMessage('Error: ' + String(e));
    } finally {
      setRunning(null);
      setTimeout(() => router.replace(router.asPath), 1000);
    }
  }

  return (
    <div>
      <TourGuide tourId="comments" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Comments Review</div>
        <div className="page-subtitle">Step 4 of the pipeline — draft, review, and post AI comments</div>
      </div>

      <PipelineStepper current={4} />

      {message && <div className={`toast-banner ${message.includes('✓') ? 'pill-green' : message.startsWith('Could not') ? 'pill-red' : 'pill-blue'}`} style={{ display: 'block', marginBottom: 16 }}>{message}</div>}

      <div id="tour-pipeline-buttons" className="card" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {PIPELINE_ACTIONS.map((a) => (
          <button key={a.key} className="btn btn-primary btn-sm" disabled={running !== null} onClick={() => runPipelineAction(a)}>
            {running === a.key ? 'Running…' : a.label}
          </button>
        ))}
      </div>

      <div id="tour-tabs" className="tabs">
        {TABS.map((t) => (
          <a key={t} href={`/comments?tab=${t}`} className={`tab ${tab === t ? 'active' : ''}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </a>
        ))}
      </div>

      {comments.length === 0 && <div className="empty-state">No {tab !== 'all' ? tab : ''} comments right now.</div>}

      {comments.map((c, i) => (
        <div key={c.id} id={i === 0 ? 'tour-first-comment' : undefined} className="comment-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{c.leads?.full_name || 'Unknown lead'}</strong>
              {c.leads?.industry && <span className="pill pill-gray" style={{ marginLeft: 8 }}>{c.leads.industry}</span>}
            </div>
            <span className={`pill ${pillClass(c.status)}`}>{c.status}</span>
          </div>

          {c.outreach_hook && <div className="stat-note" style={{ marginTop: 8 }}>Hook: {c.outreach_hook}</div>}

          <div className="comment-post">{c.posts?.content?.slice(0, 300) || '(post content unavailable)'}</div>
          <div className="comment-draft">{c.edited_text || c.drafted_text}</div>

          {c.failure_reason && <div className="stat-note" style={{ color: 'var(--red)' }}>Failed: {c.failure_reason}</div>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 12, flexWrap: 'wrap' }}>
            {c.status === 'pending' ? (
              <div id={i === 0 ? 'tour-comment-actions' : undefined} className="comment-actions" style={{ margin: 0 }}>
                <button className="btn btn-green btn-sm" disabled={busyId === c.id} onClick={() => act(c.id, 'approve', c.leads?.full_name)}>
                  {busyId === c.id ? 'Saving…' : 'Approve'}
                </button>
                <button className="btn btn-red btn-sm" disabled={busyId === c.id} onClick={() => act(c.id, 'reject', c.leads?.full_name)}>Reject</button>
              </div>
            ) : <span />}
            {postUrl(c) && (
              <a href={postUrl(c)} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ textDecoration: 'none' }}>
                {c.status === 'posted' ? 'View posted comment on LinkedIn ↗' : 'View post on LinkedIn ↗'}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

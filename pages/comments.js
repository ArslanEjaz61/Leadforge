import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import TourGuide from '../components/TourGuide';

const TABS = ['all', 'pending', 'approved', 'posted', 'rejected'];

const TOUR_STEPS = [
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
    description: 'Like the comment? Approve it — it\'ll go out next time you run "Post Approved Comments". Don\'t like it? Reject it.',
  },
];

export async function getServerSideProps({ query }) {
  const tab = TABS.includes(query.tab) ? query.tab : 'pending';
  let q = supabase
    .from('comments')
    .select('id,drafted_text,edited_text,outreach_hook,status,failure_reason,created_at,leads(full_name,industry),posts(content)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (tab !== 'all') q = q.eq('status', tab);
  const { data, error } = await q;
  return { props: { comments: data || [], tab, error: error ? error.message : null } };
}

function pillClass(status) {
  return { pending: 'pill-amber', approved: 'pill-blue', posted: 'pill-green', rejected: 'pill-red', failed: 'pill-red' }[status] || 'pill-gray';
}

export default function CommentsReview({ comments, tab }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function act(id, action) {
    setBusyId(id);
    await fetch(`/api/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    router.replace(router.asPath);
  }

  return (
    <div>
      <TourGuide tourId="comments" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Comments Review</div>
        <div className="page-subtitle">Review, tweak, and approve AI-drafted comments before they go live</div>
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

          {c.status === 'pending' && (
            <div id={i === 0 ? 'tour-comment-actions' : undefined} className="comment-actions">
              <button className="btn btn-green btn-sm" disabled={busyId === c.id} onClick={() => act(c.id, 'approve')}>Approve</button>
              <button className="btn btn-red btn-sm" disabled={busyId === c.id} onClick={() => act(c.id, 'reject')}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

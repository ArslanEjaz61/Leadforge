import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import TourGuide from '../components/TourGuide';
import PipelineStepper from '../components/PipelineStepper';

const TOUR_STEPS = [
  {
    selector: '#tour-fetch-btn',
    title: 'Step 3 — Fetch Posts',
    description: 'Pulls recent LinkedIn posts for every qualified lead, so the AI has something real to comment on.',
  },
  {
    selector: '#tour-post-stats',
    title: 'Post Metrics',
    description: 'Total posts fetched, how many are "flagged" as good commenting opportunities, and how many already have a comment posted.',
  },
  {
    selector: '#tour-posts-table',
    title: 'Posts Table',
    description: 'Every post fetched from a qualified lead shows up here — the AI score (0-100) tells you how good an opportunity it is to comment on.',
  },
];

export async function getServerSideProps() {
  const [{ count: total }, { count: flagged }, { count: withComments }, { data: posts }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('flagged_for_comment', true),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'commented'),
    supabase
      .from('posts')
      .select('id,content,ai_score,flagged_for_comment,status,fetched_at,raw_data,leads(full_name)')
      .order('fetched_at', { ascending: false })
      .limit(50),
  ]);
  return { props: { total: total || 0, flagged: flagged || 0, withComments: withComments || 0, posts: posts || [] } };
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Posts({ total, flagged, withComments, posts }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);

  async function fetchPosts() {
    setRunning(true);
    setMessage(null);
    try {
      const r = await fetch('/api/trigger/fetch-posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await r.json();
      setMessage(data.message || (data.ok ? 'Done' : 'Something went wrong'));
    } catch (e) {
      setMessage('Error: ' + String(e));
    } finally {
      setRunning(false);
      setTimeout(() => router.replace(router.asPath), 1000);
    }
  }

  return (
    <div>
      <TourGuide tourId="posts" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Posts</div>
        <div className="page-subtitle">Step 3 of the pipeline — LinkedIn posts fetched from qualified leads</div>
      </div>

      <PipelineStepper current={3} />

      {message && <div className="toast-banner pill-blue" style={{ display: 'block', marginBottom: 16 }}>{message}</div>}

      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>Fetch Posts for Qualified Leads</div>
          <div className="stat-note">Pulls recent LinkedIn posts so the AI has real content to comment on.</div>
        </div>
        <button id="tour-fetch-btn" className="btn btn-primary btn-sm" disabled={running} onClick={fetchPosts}>
          {running ? 'Fetching…' : 'Fetch Posts'}
        </button>
      </div>

      <div id="tour-post-stats" className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card"><div className="card-title">Total Posts</div><div className="stat-value">{total}</div></div>
        <div className="card"><div className="card-title">Flagged for Comment</div><div className="stat-value">{flagged}</div></div>
        <div className="card"><div className="card-title">Commented</div><div className="stat-value">{withComments}</div></div>
        <div className="card"><div className="card-title">Flag Rate</div><div className="stat-value">{total ? Math.round((flagged / total) * 100) : 0}%</div></div>
      </div>

      <div id="tour-posts-table" className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Lead</th><th>Post</th><th>Posted</th><th>AI Score</th><th>Flagged</th><th>Status</th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.leads?.full_name || '—'}</strong></td>
                  <td style={{ maxWidth: 380 }}>{(p.content || '').slice(0, 140)}{(p.content || '').length > 140 ? '…' : ''}</td>
                  <td className="stat-note">{p.raw_data?.date ? `${p.raw_data.date} ago` : '—'}</td>
                  <td>{p.ai_score ?? '—'}</td>
                  <td>{p.flagged_for_comment ? <span className="pill pill-green">Yes</span> : <span className="pill pill-gray">No</span>}</td>
                  <td><span className="pill pill-blue">{p.status}</span></td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={6}><div className="empty-state">No posts fetched yet — click "Fetch Posts" above.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

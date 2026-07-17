import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/format';
import TourGuide from '../components/TourGuide';

const TOUR_STEPS = [
  {
    selector: '#tour-stats',
    title: 'Pipeline Overview',
    description: 'These 4 cards give you an instant snapshot: total leads, how many are qualified, how many comments are waiting for review, and how many comments have been posted today.',
  },
  {
    selector: '#tour-search-box',
    title: 'Search LinkedIn for New Leads',
    description: 'Type in any keyword (e.g. "AI agency owner" or "CTO looking for developer"). As soon as the search runs, the new leads are automatically AI-qualified too — no extra step needed.',
  },
  {
    selector: '#tour-qualify-btn',
    title: 'Qualify Raw Leads',
    description: 'If a large batch of leads ever comes in at once and not all of them get auto-qualified, use this button to qualify whatever is still left as "raw".',
  },
  {
    selector: '#tour-pipeline-actions',
    title: 'Run Pipeline Steps',
    description: 'These are the rest of the automation steps: fetching posts, having the AI draft comments, posting approved comments to LinkedIn, and checking for replies.',
  },
  {
    selector: '#tour-recent-activity',
    title: 'Recent Activity',
    description: 'A live log of every action the system takes — what happened, for which lead, and when.',
  },
  {
    selector: '#tour-sidebar',
    title: 'Navigation',
    description: 'Use the sidebar to jump to Comments Review, Qualified Leads, Posts, Analytics, Replies, and Settings. Each page shows a similar guide the first time you visit it.',
  },
];

export async function getServerSideProps() {
  const [{ count: totalLeads }, { count: qualifiedCount }, { count: pendingCount }, { data: settings }, { data: activity }] =
    await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('settings').select('*').eq('id', 1).single(),
      supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(8),
    ]);

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const { count: postedToday } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'posted')
    .gte('posted_at', todayStart.toISOString());

  const { count: rawCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'raw');
  const { count: engagedCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'engaged');
  const { count: disqualifiedCount } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'disqualified');

  return {
    props: {
      totalLeads: totalLeads || 0,
      qualifiedCount: qualifiedCount || 0,
      pendingCount: pendingCount || 0,
      postedToday: postedToday || 0,
      settings: settings || {},
      activity: activity || [],
      rawCount: rawCount || 0,
      engagedCount: engagedCount || 0,
      disqualifiedCount: disqualifiedCount || 0,
    },
  };
}

const ACTIONS = [
  { key: 'qualify', label: 'Qualify Raw Leads' },
  { key: 'fetch-posts', label: 'Fetch Posts' },
  { key: 'evaluate', label: 'Evaluate & Draft Comments' },
  { key: 'post-comments', label: 'Post Approved Comments' },
  { key: 'detect-replies', label: 'Check for Replies' },
];

function statusColor(status) {
  if (status === 'success') return 'pill-green';
  if (status === 'failed') return 'pill-red';
  return 'pill-amber';
}

export default function Dashboard({ totalLeads, qualifiedCount, pendingCount, postedToday, settings, activity, rawCount, engagedCount, disqualifiedCount }) {
  const [running, setRunning] = useState(null);
  const [lastMessage, setLastMessage] = useState(null);
  const [searchKeywords, setSearchKeywords] = useState('startup founder AI automation');

  async function runAction(action, bodyOverride) {
    setRunning(action.key);
    setLastMessage(null);
    try {
      const r = await fetch(`/api/trigger/${action.key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyOverride || action.body || {}),
      });
      const data = await r.json();
      setLastMessage(data.message || (data.ok ? 'Done' : 'Something went wrong'));
    } catch (e) {
      setLastMessage('Error: ' + String(e));
    } finally {
      setRunning(null);
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  function runSearch() {
    runAction({ key: 'search' }, { keywords: searchKeywords, limit: 10 });
  }

  const qualRate = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0;
  const dailyCap = settings.daily_comment_cap ?? 5;

  return (
    <div>
      <TourGuide tourId="dashboard" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">LinkedIn outreach pipeline overview</div>
      </div>

      {lastMessage && <div className="toast-banner pill-blue" style={{ display: 'block' }}>{lastMessage}</div>}

      <div id="tour-stats" className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Total Pipeline</div>
          <div className="stat-value">{totalLeads}</div>
          <div className="stat-note">{rawCount} raw · {qualifiedCount} qualified · {disqualifiedCount} disqualified · {engagedCount} engaged</div>
        </div>
        <div className="card">
          <div className="card-title">Qualified Leads</div>
          <div className="stat-value">{qualifiedCount}</div>
          <div className="stat-note">{qualRate}% qualification rate</div>
        </div>
        <div className="card">
          <div className="card-title">Pending Review</div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-note">{pendingCount === 0 ? 'All caught up' : 'Awaiting approval'}</div>
        </div>
        <div className="card">
          <div className="card-title">Posted Today</div>
          <div className="stat-value">{postedToday} / {dailyCap}</div>
          <div className="stat-note">Daily cap: {dailyCap} comments</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div id="tour-search-box">
          <div className="card-title">Search LinkedIn for New Leads</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              className="field-input"
              style={{ maxWidth: 320, flex: 1 }}
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              placeholder="e.g. CTO looking for MERN developer"
            />
            <button className="btn btn-primary btn-sm" disabled={running !== null || !searchKeywords.trim()} onClick={runSearch}>
              {running === 'search' ? 'Searching…' : 'Search'}
            </button>
          </div>
          <div className="stat-note" style={{ marginBottom: 18 }}>
            Try: "AI agent developer", "n8n automation consultant", "DevOps engineer hiring", "full stack MERN developer"
          </div>
          </div>

          <div className="card-title">Run Pipeline Steps</div>
          <div id="tour-pipeline-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {ACTIONS.map((a) => (
              <button
                key={a.key}
                id={a.key === 'qualify' ? 'tour-qualify-btn' : undefined}
                className="btn btn-primary btn-sm"
                disabled={running !== null}
                onClick={() => runAction(a)}
              >
                {running === a.key ? 'Running…' : a.label}
              </button>
            ))}
          </div>

          <div id="tour-recent-activity">
          <div className="card-title" style={{ marginTop: 24 }}>Recent Activity</div>
          {activity.length === 0 && <div className="empty-state">No activity yet — run a pipeline step above.</div>}
          {activity.map((a) => (
            <div key={a.id} className="activity-row">
              <div className={`activity-dot ${a.status === 'success' ? 'pill-green' : a.status === 'failed' ? 'pill-red' : 'pill-amber'}`} style={{ background: 'currentColor' }} />
              <div style={{ flex: 1 }}>
                <div>
                  <span className={`pill ${statusColor(a.status)}`} style={{ marginRight: 8 }}>{a.action.replace(/_/g, ' ')}</span>
                  {a.lead_name && <strong>{a.lead_name}</strong>}
                </div>
                <div className="stat-note">{a.detail}</div>
              </div>
              <div className="stat-note">{formatDateTime(a.created_at)}</div>
            </div>
          ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title">Posting Window</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{settings.posting_window_start} – {settings.posting_window_end}</div>
            <div className="stat-note">Timezone: {settings.posting_timezone}</div>
          </div>
          <div className="card">
            <div className="card-title">Auto-Approve</div>
            <span className={`pill ${settings.auto_approve ? 'pill-green' : 'pill-gray'}`}>
              {settings.auto_approve ? 'On — comments go straight to posting queue' : 'Off — manual review required'}
            </span>
          </div>
          <div className="card">
            <div className="card-title">Pipeline Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>Raw leads</span><strong>{rawCount}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>Qualified</span><strong>{qualifiedCount}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}><span>Engaged</span><strong>{engagedCount}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

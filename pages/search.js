import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/format';
import TourGuide from '../components/TourGuide';
import PipelineStepper from '../components/PipelineStepper';

const TOUR_STEPS = [
  {
    selector: '#tour-search-box',
    title: 'Step 1 — Search LinkedIn for New Leads',
    description: 'Type in any keyword (e.g. "AI agency owner" or "CTO looking for developer"). As soon as the search runs, the new leads are automatically AI-qualified too — no extra step needed.',
  },
  {
    selector: '#tour-search-activity',
    title: 'Recent Searches',
    description: 'A log of past searches and how many leads each one found.',
  },
];

export async function getServerSideProps() {
  const { data: activity } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'lead_search')
    .order('created_at', { ascending: false })
    .limit(10);
  return { props: { activity: activity || [] } };
}

function statusColor(status) {
  if (status === 'success') return 'pill-green';
  if (status === 'failed') return 'pill-red';
  return 'pill-amber';
}

export default function Search({ activity }) {
  const [running, setRunning] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [searchKeywords, setSearchKeywords] = useState('');

  async function runSearch() {
    setRunning(true);
    setLastMessage(null);
    try {
      const r = await fetch('/api/trigger/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: searchKeywords, limit: 10 }),
      });
      const data = await r.json();
      setLastMessage(data.message || (data.ok ? 'Done' : 'Something went wrong'));
    } catch (e) {
      setLastMessage('Error: ' + String(e));
    } finally {
      setRunning(false);
      setTimeout(() => window.location.reload(), 1200);
    }
  }

  return (
    <div>
      <TourGuide tourId="search" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Search Leads</div>
        <div className="page-subtitle">Step 1 of the pipeline — find new LinkedIn leads by keyword</div>
      </div>

      <PipelineStepper current={1} />

      {lastMessage && <div className="toast-banner pill-blue" style={{ display: 'block', marginBottom: 16 }}>{lastMessage}</div>}

      <div id="tour-search-box" className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Search LinkedIn for New Leads</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            className="field-input"
            style={{ maxWidth: 420, flex: 1 }}
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
            placeholder="e.g. CTO looking for MERN developer"
          />
          <button className="btn btn-primary btn-sm" disabled={running || !searchKeywords.trim()} onClick={runSearch}>
            {running ? 'Searching…' : 'Search'}
          </button>
        </div>
        <div className="stat-note">
          Try: "AI agent developer", "n8n automation consultant", "DevOps engineer hiring", "full stack MERN developer"
        </div>
        <div className="stat-note" style={{ marginTop: 10 }}>
          As soon as this runs, new leads are automatically AI-qualified too — next step happens on its own. Head to <strong>Qualify</strong> to see the results.
        </div>
      </div>

      <div id="tour-search-activity" className="card">
        <div className="card-title">Recent Searches</div>
        {activity.length === 0 && <div className="empty-state">No searches yet — run one above.</div>}
        {activity.map((a) => (
          <div key={a.id} className="activity-row">
            <div className={`activity-dot ${a.status === 'success' ? 'pill-green' : a.status === 'failed' ? 'pill-red' : 'pill-amber'}`} style={{ background: 'currentColor' }} />
            <div style={{ flex: 1 }}>
              <div>
                <span className={`pill ${statusColor(a.status)}`} style={{ marginRight: 8 }}>search</span>
              </div>
              <div className="stat-note">{a.detail}</div>
            </div>
            <div className="stat-note">{formatDateTime(a.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

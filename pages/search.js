import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/format';
import TourGuide from '../components/TourGuide';
import PipelineStepper from '../components/PipelineStepper';

const TOUR_STEPS = [
  {
    selector: '#tour-search-box',
    title: 'One keyword. Everything runs.',
    description: 'Type who you want to reach (e.g. "AI automation founder"). Hit Run — the system searches LinkedIn, AI-qualifies the leads, fetches their posts, and drafts personalized comments, all on its own. You just review and approve.',
  },
  {
    selector: '#tour-search-activity',
    title: 'Recent Runs',
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

const STAGES = [
  { key: 'search', label: 'Searching LinkedIn & AI-qualifying leads', endpoint: 'search' },
  { key: 'fetch', label: 'Fetching their recent posts', endpoint: 'fetch-posts' },
  { key: 'draft', label: 'AI drafting personalized comments', endpoint: 'evaluate' },
];

export default function Search({ activity }) {
  const [searchKeywords, setSearchKeywords] = useState('');
  const [status, setStatus] = useState({}); // { search: 'running'|'done'|'error', ... }
  const [notes, setNotes] = useState({}); // per-stage message
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(null);

  async function runFullPipeline() {
    if (!searchKeywords.trim()) return;
    setRunning(true);
    setFinished(false);
    setError(null);
    setStatus({});
    setNotes({});

    for (const stage of STAGES) {
      setStatus((s) => ({ ...s, [stage.key]: 'running' }));
      try {
        const body = stage.key === 'search' ? { keywords: searchKeywords, limit: 10 } : {};
        const r = await fetch(`/api/trigger/${stage.endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok || data.ok === false) throw new Error(data.message || data.error || 'Step failed');
        setStatus((s) => ({ ...s, [stage.key]: 'done' }));
        if (data.message) setNotes((n) => ({ ...n, [stage.key]: data.message }));
      } catch (e) {
        setStatus((s) => ({ ...s, [stage.key]: 'error' }));
        setError(`Failed at "${stage.label}": ${String(e.message || e)}`);
        setRunning(false);
        return;
      }
    }
    setRunning(false);
    setFinished(true);
  }

  function statusIcon(st) {
    if (st === 'running') return <span className="spin">⏳</span>;
    if (st === 'done') return <span style={{ color: 'var(--green)' }}>✓</span>;
    if (st === 'error') return <span style={{ color: 'var(--red)' }}>✕</span>;
    return <span style={{ color: 'var(--text-muted)' }}>•</span>;
  }

  return (
    <div>
      <TourGuide tourId="search" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Search Leads</div>
        <div className="page-subtitle">Step 1 — enter one keyword and the whole pipeline runs automatically</div>
      </div>

      <PipelineStepper current={1} />

      <div id="tour-search-box" className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Find Leads &amp; Draft Comments — Automatically</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            className="field-input"
            style={{ maxWidth: 420, flex: 1 }}
            value={searchKeywords}
            onChange={(e) => setSearchKeywords(e.target.value)}
            placeholder="e.g. AI automation founder, CTO hiring developers"
            disabled={running}
            onKeyDown={(e) => { if (e.key === 'Enter' && !running) runFullPipeline(); }}
          />
          <button className="btn btn-primary btn-sm" disabled={running || !searchKeywords.trim()} onClick={runFullPipeline}>
            {running ? 'Running…' : 'Run'}
          </button>
        </div>
        <div className="stat-note">
          Try: "AI agent developer", "n8n automation consultant", "DevOps engineer hiring", "full stack MERN developer"
        </div>
        <div className="stat-note" style={{ marginTop: 10 }}>
          One click does it all — search → AI-qualify → fetch posts → draft comments. Takes 1-3 minutes. Then just review &amp; approve.
        </div>
      </div>

      {(running || finished || error) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-title">Pipeline Progress</div>
          {STAGES.map((stage) => (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 20, textAlign: 'center', fontSize: 15 }}>{statusIcon(status[stage.key])}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: status[stage.key] ? 'var(--text-primary)' : 'var(--text-muted)' }}>{stage.label}</div>
                {notes[stage.key] && <div className="stat-note">{notes[stage.key]}</div>}
              </div>
            </div>
          ))}
          {error && <div className="stat-note" style={{ color: 'var(--red)', marginTop: 12 }}>{error}</div>}
          {finished && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className="pill pill-green">All done ✓</span>
              <span className="stat-note">Comments are drafted and waiting for your review.</span>
              <Link href="/comments" className="btn btn-primary btn-sm">Review &amp; Approve Comments →</Link>
            </div>
          )}
        </div>
      )}

      <div id="tour-search-activity" className="card">
        <div className="card-title">Recent Runs</div>
        {activity.length === 0 && <div className="empty-state">No searches yet — run one above.</div>}
        {activity.map((a) => (
          <div key={a.id} className="activity-row">
            <div className={`activity-dot ${a.status === 'success' ? 'pill-green' : a.status === 'failed' ? 'pill-red' : 'pill-amber'}`} style={{ background: 'currentColor' }} />
            <div style={{ flex: 1 }}>
              <div><span className="pill pill-green" style={{ marginRight: 8 }}>search</span></div>
              <div className="stat-note">{a.detail}</div>
            </div>
            <div className="stat-note">{formatDateTime(a.created_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

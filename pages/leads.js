import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import TourGuide from '../components/TourGuide';
import PipelineStepper from '../components/PipelineStepper';

export async function getServerSideProps() {
  const [{ data: leads }, { count: rawCount }] = await Promise.all([
    supabase
      .from('leads')
      .select('id,full_name,headline,company,industry,icp_score,status,posts_fetched,comments_posted_count,linkedin_profile_url,created_at')
      .in('status', ['qualified', 'engaged', 'connected'])
      .order('icp_score', { ascending: false })
      .limit(100),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'raw'),
  ]);

  const rows = leads || [];
  const byScore = {};
  const byIndustry = {};
  for (const l of rows) {
    byScore[l.icp_score] = (byScore[l.icp_score] || 0) + 1;
    const ind = l.industry || 'Other';
    byIndustry[ind] = (byIndustry[ind] || 0) + 1;
  }
  return { props: { leads: rows, byScore, byIndustry, rawCount: rawCount || 0 } };
}

function statusPill(status) {
  return { qualified: 'pill-blue', engaged: 'pill-green', connected: 'pill-green' }[status] || 'pill-gray';
}

const TOUR_STEPS = [
  {
    selector: '#tour-raw-banner',
    title: 'Raw leads waiting',
    description: 'Leads from new searches now get qualified automatically. If some leads still show as "raw" here (e.g. a big batch arrived at once), use this button to qualify what\'s left.',
  },
  {
    selector: '#tour-icp-distribution',
    title: 'ICP Score Distribution',
    description: 'Shows how many leads landed at each fit score — 5 is the best fit (for AI Automation / Dev / DevOps clients), 1 is the weakest.',
  },
  {
    selector: '#tour-industry-breakdown',
    title: 'Industry Breakdown',
    description: 'Which category leads fall into — AI/Automation, Software Development, DevOps/Cloud, Startup/SaaS, etc.',
  },
  {
    selector: '#tour-leads-table',
    title: 'Leads Table',
    description: 'Full detail on every qualified lead — score, whether their posts were fetched, how many comments have been posted, and their current status.',
  },
];

export default function QualifiedLeads({ leads, byScore, byIndustry, rawCount }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function qualifyNow() {
    setRunning(true);
    await fetch('/api/trigger/qualify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    setRunning(false);
    router.replace(router.asPath);
  }

  return (
    <div>
      <TourGuide tourId="leads" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Qualified Leads</div>
        <div className="page-subtitle">Step 2 of the pipeline — leads that passed ICP qualification</div>
      </div>

      <PipelineStepper current={2} />

      {rawCount > 0 && (
        <div id="tour-raw-banner" className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong>{rawCount} lead(s)</strong> are still <span className="pill pill-amber">raw</span> — not yet AI-qualified.
            <div className="stat-note">These usually clear on the next search, or qualify them right now:</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={running} onClick={qualifyNow}>
            {running ? 'Qualifying…' : 'Qualify Raw Leads'}
          </button>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div id="tour-icp-distribution" className="card">
          <div className="card-title">ICP Score Distribution</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ fontSize: 20 }}>{byScore[s] || 0}</div>
                <div className="stat-note">ICP {s}</div>
              </div>
            ))}
          </div>
        </div>
        <div id="tour-industry-breakdown" className="card">
          <div className="card-title">Industry Breakdown</div>
          {Object.entries(byIndustry).map(([ind, count]) => (
            <div key={ind} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13.5 }}>
              <span>{ind}</span><strong>{count}</strong>
            </div>
          ))}
          {Object.keys(byIndustry).length === 0 && <div className="stat-note">No qualified leads yet.</div>}
        </div>
      </div>

      <div id="tour-leads-table" className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Company</th><th>Industry</th><th>ICP</th><th>Posts</th><th>Comments</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <a href={l.linkedin_profile_url} target="_blank" rel="noreferrer"><strong>{l.full_name}</strong></a>
                    <div className="stat-note">{l.headline}</div>
                  </td>
                  <td>{l.company || '—'}</td>
                  <td>{l.industry || '—'}</td>
                  <td><span className="pill pill-blue">{l.icp_score}/5</span></td>
                  <td>{l.posts_fetched ? '✓' : '—'}</td>
                  <td>{l.comments_posted_count}</td>
                  <td><span className={`pill ${statusPill(l.status)}`}>{l.status}</span></td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={7}><div className="empty-state">No qualified leads yet — run a search from the Dashboard.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

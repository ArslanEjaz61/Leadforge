import { supabase } from '../lib/supabase';
import TourGuide from '../components/TourGuide';

const TOUR_STEPS = [
  {
    selector: '#tour-funnel',
    title: 'Outreach Funnel',
    description: 'The whole pipeline at a glance — how many leads were scraped, qualified, had posts fetched, and got a comment posted. You can spot the drop-off at each stage.',
  },
  {
    selector: '#tour-industry-chart',
    title: 'Industry Breakdown',
    description: 'What category qualified leads fall into — AI/Automation, Software Development, DevOps/Cloud, etc.',
  },
  {
    selector: '#tour-post-status',
    title: 'Post Status Breakdown',
    description: 'Current status of fetched posts — new, evaluated, skipped, or commented.',
  },
];

export async function getServerSideProps() {
  const [{ count: raw }, { count: qualified }, { count: postsFetched }, { count: commented }, { data: leadsByIndustry }, { data: postsByStatus }] =
    await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'posted'),
      supabase.from('leads').select('industry').not('industry', 'is', null),
      supabase.from('posts').select('status'),
    ]);

  const industryCounts = {};
  for (const l of leadsByIndustry || []) industryCounts[l.industry] = (industryCounts[l.industry] || 0) + 1;

  const statusCounts = {};
  for (const p of postsByStatus || []) statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;

  return {
    props: {
      funnel: { raw: raw || 0, qualified: qualified || 0, postsFetched: postsFetched || 0, commented: commented || 0 },
      industryCounts,
      statusCounts,
    },
  };
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span><strong>{value}</strong>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--gray-soft)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

export default function Analytics({ funnel, industryCounts, statusCounts }) {
  const funnelMax = funnel.raw || 1;
  const industryMax = Math.max(1, ...Object.values(industryCounts));
  const statusMax = Math.max(1, ...Object.values(statusCounts));

  return (
    <div>
      <TourGuide tourId="analytics" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Analytics</div>
        <div className="page-subtitle">Outreach funnel performance</div>
      </div>

      <div className="grid grid-2">
        <div id="tour-funnel" className="card">
          <div className="card-title">Funnel — Scraped → Qualified → Fetched → Commented</div>
          <Bar label="Raw leads scraped" value={funnel.raw} max={funnelMax} color="var(--accent)" />
          <Bar label="Qualified" value={funnel.qualified} max={funnelMax} color="var(--blue)" />
          <Bar label="Posts fetched" value={funnel.postsFetched} max={funnelMax} color="var(--amber)" />
          <Bar label="Comments posted" value={funnel.commented} max={funnelMax} color="var(--green)" />
        </div>

        <div id="tour-industry-chart" className="card">
          <div className="card-title">Industry Breakdown</div>
          {Object.entries(industryCounts).map(([k, v]) => (
            <Bar key={k} label={k} value={v} max={industryMax} color="var(--accent)" />
          ))}
          {Object.keys(industryCounts).length === 0 && <div className="empty-state">No qualified leads yet.</div>}
        </div>
      </div>

      <div id="tour-post-status" className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Post Status Breakdown</div>
        <div className="grid grid-4">
          {Object.entries(statusCounts).map(([k, v]) => (
            <div key={k}>
              <div className="stat-value" style={{ fontSize: 20 }}>{v}</div>
              <div className="stat-note">{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

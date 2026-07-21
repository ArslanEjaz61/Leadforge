import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/format';
import TourGuide from '../components/TourGuide';
import PipelineStepper from '../components/PipelineStepper';

const TOUR_STEPS = [
  {
    selector: '#tour-check-replies-btn',
    title: 'Step 5 — Check for Replies',
    description: 'Checks LinkedIn for replies on comments that were posted, so you know who\'s engaging back.',
  },
  {
    selector: '#tour-replies-table',
    title: 'Replies & Engagement',
    description: 'When a lead replies to your comment, it shows up here — the AI analyzes the reply\'s sentiment (positive/neutral/negative) and flags whether they\'re "Ready" for a connection request.',
  },
];

export async function getServerSideProps() {
  const { data: replies } = await supabase
    .from('replies')
    .select('id,reply_text,sentiment,ready_for_connection,connection_sent,detected_at,leads(full_name,linkedin_profile_url)')
    .order('detected_at', { ascending: false })
    .limit(50);
  return { props: { replies: replies || [] } };
}

function sentimentPill(s) {
  return { positive: 'pill-green', neutral: 'pill-gray', negative: 'pill-red' }[s] || 'pill-gray';
}

export default function Replies({ replies }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);

  async function checkReplies() {
    setRunning(true);
    setMessage(null);
    try {
      const r = await fetch('/api/trigger/detect-replies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
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
      <TourGuide tourId="replies" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Replies</div>
        <div className="page-subtitle">Step 5 of the pipeline — engagement tracking on posted comments</div>
      </div>

      <PipelineStepper current={5} />

      {message && <div className="toast-banner pill-blue" style={{ display: 'block', marginBottom: 16 }}>{message}</div>}

      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="card-title" style={{ marginBottom: 4 }}>Check for Replies</div>
          <div className="stat-note">Looks for new replies on posted comments and flags leads ready to connect with.</div>
        </div>
        <button id="tour-check-replies-btn" className="btn btn-primary btn-sm" disabled={running} onClick={checkReplies}>
          {running ? 'Checking…' : 'Check for Replies'}
        </button>
      </div>

      <div id="tour-replies-table" className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Lead</th><th>Reply</th><th>Sentiment</th><th>Ready to Connect</th><th>Detected</th></tr></thead>
            <tbody>
              {replies.map((r) => (
                <tr key={r.id}>
                  <td><a href={r.leads?.linkedin_profile_url} target="_blank" rel="noreferrer"><strong>{r.leads?.full_name}</strong></a></td>
                  <td style={{ maxWidth: 380 }}>{r.reply_text}</td>
                  <td><span className={`pill ${sentimentPill(r.sentiment)}`}>{r.sentiment}</span></td>
                  <td>
                    {r.connection_sent ? <span className="pill pill-blue">Sent</span> :
                      r.ready_for_connection ? <span className="pill pill-green">Ready</span> :
                      <span className="pill pill-gray">Not yet</span>}
                  </td>
                  <td className="stat-note">{formatDateTime(r.detected_at)}</td>
                </tr>
              ))}
              {replies.length === 0 && <tr><td colSpan={5}><div className="empty-state">No replies detected yet — click "Check for Replies" above.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

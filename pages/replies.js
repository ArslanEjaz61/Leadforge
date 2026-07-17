import { supabase } from '../lib/supabase';
import { formatDateTime } from '../lib/format';
import TourGuide from '../components/TourGuide';

const TOUR_STEPS = [
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
  return (
    <div>
      <TourGuide tourId="replies" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Replies</div>
        <div className="page-subtitle">Engagement tracking on posted comments</div>
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
              {replies.length === 0 && <tr><td colSpan={5}><div className="empty-state">No replies detected yet — run "Check for Replies" from the Dashboard.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

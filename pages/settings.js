import { useState } from 'react';
import { supabase } from '../lib/supabase';
import TourGuide from '../components/TourGuide';

const TOUR_STEPS = [
  {
    selector: '#tour-posting-limits',
    title: 'Posting Limits & Schedule',
    description: 'How many comments should go out per day (for safety), and which time window (e.g. 6am-11pm) posting should stay active in — important to avoid LinkedIn flagging the account.',
  },
  {
    selector: '#tour-cooldowns',
    title: 'Cooldowns & Bot Behavior',
    description: 'Prevent repeat comments on the same lead too soon (cooldown days), cap the max comments per lead, and add random delays so the automation feels human. Turning on Auto-Approve sends comments straight to the posting queue without manual review.',
  },
];

export async function getServerSideProps() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return { props: { settings: data || {} } };
}

export default function Settings({ settings }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        daily_comment_cap: Number(form.daily_comment_cap),
        posting_window_start: form.posting_window_start,
        posting_window_end: form.posting_window_end,
        posting_timezone: form.posting_timezone,
        cooldown_days_between_comments: Number(form.cooldown_days_between_comments),
        max_comments_per_lead: Number(form.max_comments_per_lead),
        delay_min_seconds: Number(form.delay_min_seconds),
        delay_max_seconds: Number(form.delay_max_seconds),
        auto_approve: form.auto_approve,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <div>
      <TourGuide tourId="settings" steps={TOUR_STEPS} />
      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className="page-subtitle">Configuration rules for the automation engine</div>
      </div>

      <div className="grid grid-2">
        <div id="tour-posting-limits" className="card">
          <div className="card-title">Posting Limits &amp; Schedule</div>
          <div className="field-row">
            <label className="field-label">Daily comment cap</label>
            <input className="field-input" type="number" value={form.daily_comment_cap ?? ''} onChange={(e) => set('daily_comment_cap', e.target.value)} />
          </div>
          <div className="field-row">
            <label className="field-label">Posting window start</label>
            <input className="field-input" type="time" value={form.posting_window_start ?? ''} onChange={(e) => set('posting_window_start', e.target.value)} />
          </div>
          <div className="field-row">
            <label className="field-label">Posting window end</label>
            <input className="field-input" type="time" value={form.posting_window_end ?? ''} onChange={(e) => set('posting_window_end', e.target.value)} />
          </div>
          <div className="field-row">
            <label className="field-label">Timezone</label>
            <input className="field-input" value={form.posting_timezone ?? ''} onChange={(e) => set('posting_timezone', e.target.value)} />
          </div>
        </div>

        <div id="tour-cooldowns" className="card">
          <div className="card-title">Cooldowns &amp; Bot Behavior</div>
          <div className="field-row">
            <label className="field-label">Cooldown between comments on same lead (days)</label>
            <input className="field-input" type="number" value={form.cooldown_days_between_comments ?? ''} onChange={(e) => set('cooldown_days_between_comments', e.target.value)} />
          </div>
          <div className="field-row">
            <label className="field-label">Max comments per lead</label>
            <input className="field-input" type="number" value={form.max_comments_per_lead ?? ''} onChange={(e) => set('max_comments_per_lead', e.target.value)} />
          </div>
          <div className="field-row">
            <label className="field-label">Random delay min (seconds)</label>
            <input className="field-input" type="number" value={form.delay_min_seconds ?? ''} onChange={(e) => set('delay_min_seconds', e.target.value)} />
          </div>
          <div className="field-row">
            <label className="field-label">Random delay max (seconds)</label>
            <input className="field-input" type="number" value={form.delay_max_seconds ?? ''} onChange={(e) => set('delay_max_seconds', e.target.value)} />
          </div>
          <div className="field-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className={`toggle ${form.auto_approve ? 'on' : ''}`} onClick={() => set('auto_approve', !form.auto_approve)}>
              <div className="toggle-knob" />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Auto-Approve</div>
              <div className="stat-note">Comments go directly to the posting queue. Turn off for manual review.</div>
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Settings'}
      </button>
    </div>
  );
}

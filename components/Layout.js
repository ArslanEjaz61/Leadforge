import { useRouter } from 'next/router';
import Link from 'next/link';

const PATH_TO_TOUR = {
  '/': 'dashboard',
  '/comments': 'comments',
  '/leads': 'leads',
  '/posts': 'posts',
  '/analytics': 'analytics',
  '/replies': 'replies',
  '/settings': 'settings',
};

const NAV = [
  { section: 'Overview', links: [{ href: '/', label: 'Dashboard', icon: '◧' }] },
  {
    section: 'Daily Ops',
    links: [
      { href: '/comments', label: 'Comments Review', icon: '💬' },
      { href: '/leads', label: 'Qualified Leads', icon: '👤' },
    ],
  },
  {
    section: 'Data',
    links: [
      { href: '/posts', label: 'Posts', icon: '📄' },
      { href: '/replies', label: 'Replies', icon: '↩' },
    ],
  },
  { section: 'Reports', links: [{ href: '/analytics', label: 'Analytics', icon: '📊' }] },
  { section: 'Config', links: [{ href: '/settings', label: 'Settings', icon: '⚙' }] },
];

export default function Layout({ children }) {
  const router = useRouter();
  const tourId = PATH_TO_TOUR[router.pathname];

  function restartTour() {
    const fn = tourId && typeof window !== 'undefined' && window[`__restartTour_${tourId}`];
    if (fn) fn();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" id="tour-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">L</div>
          <div>
            <div className="sidebar-brand-name">LeadForge AI</div>
            <div className="sidebar-brand-sub">LinkedIn Automation</div>
          </div>
        </div>
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`sidebar-link ${router.pathname === link.href ? 'active' : ''}`}
              >
                <span className="sidebar-link-icon">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </aside>
      <main className="main">{children}</main>
      {tourId && (
        <button className="help-fab" title="Replay guided tour for this page" onClick={restartTour}>?</button>
      )}
    </div>
  );
}

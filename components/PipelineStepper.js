import Link from 'next/link';

const STEPS = [
  { n: 1, label: 'Search', href: '/search' },
  { n: 2, label: 'Qualify', href: '/leads' },
  { n: 3, label: 'Fetch Posts', href: '/posts' },
  { n: 4, label: 'Draft & Review', href: '/comments' },
  { n: 5, label: 'Replies', href: '/replies' },
];

export default function PipelineStepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((s, i) => (
        <div key={s.n} className="stepper-item">
          <Link href={s.href} className={`stepper-step ${s.n === current ? 'active' : ''} ${s.n < current ? 'done' : ''}`}>
            <span className="stepper-dot">{s.n < current ? '✓' : s.n}</span>
            <span className="stepper-label">{s.label}</span>
          </Link>
          {i < STEPS.length - 1 && <span className="stepper-line" />}
        </div>
      ))}
    </div>
  );
}

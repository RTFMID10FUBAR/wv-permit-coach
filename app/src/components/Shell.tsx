import type { ReactNode } from 'react';
import { Link } from '../router';

export const DISCLAIMER =
  "Unofficial study aid. Not affiliated with or endorsed by the West Virginia Division of Motor Vehicles. Study content is based on the West Virginia Driver's Licensing Handbook and identified official sources.";

export function Disclaimer() {
  return <p className="disclaimer">{DISCLAIMER}</p>;
}

export function Screen({
  title,
  subtitle,
  back = '/',
  backLabel = 'Home',
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  back?: string | null;
  backLabel?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main className="screen">
      <header className="screen-header">
        {back ? (
          <Link to={back} className="back-link">
            ← {backLabel}
          </Link>
        ) : null}
        <h1 className="screen-title">{title}</h1>
        {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
        {actions}
      </header>
      {children}
    </main>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function MasteryBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const tone = pct >= 85 ? 'strong' : pct >= 65 ? 'good' : pct >= 40 ? 'fair' : 'weak';
  return (
    <div className="mastery-bar" role="img" aria-label={`${label ? `${label}: ` : ''}${pct}% mastery`}>
      <div className={`mastery-fill mastery-${tone}`} style={{ width: `${pct}%` }} />
      <span className="mastery-value">{pct}%</span>
    </div>
  );
}

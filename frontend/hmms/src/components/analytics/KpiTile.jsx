import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

/**
 * A headline number with its change against last year. The change is green when it is good
 * news (more revenue, but less commission), with an arrow so colour is never the only cue.
 */
export default function KpiTile({ label, value, note, change, upIsGood = true, changeLabel }) {
  const direction = change == null || Math.abs(change) < 0.05 ? 'flat' : change > 0 ? 'up' : 'down';
  const good = direction === 'flat' ? null : (direction === 'up') === upIsGood;
  const Arrow = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  return (
    <div className="kpi-tile">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {change !== undefined && (
        <span className={`kpi-change ${good === null ? 'neutral' : good ? 'good' : 'bad'}`}>
          <Arrow size={14} aria-hidden="true" />
          {changeLabel}
        </span>
      )}
      {note && <span className="kpi-note">{note}</span>}
    </div>
  );
}

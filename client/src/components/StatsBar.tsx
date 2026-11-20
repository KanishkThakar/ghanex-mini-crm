import { money } from '../format';
import { STATUSES, type LeadStatus, type Stats } from '../types';

interface Props {
  stats: Stats | null;
  active: LeadStatus | 'All';
  onSelect: (value: LeadStatus | 'All') => void;
}

export function StatsBar({ stats, active, onSelect }: Props) {
  const cards = [
    { key: 'All' as const, label: 'Total leads', value: stats?.total ?? 0, tone: 'all' },
    ...STATUSES.map((status) => ({
      key: status,
      label: status,
      value: stats?.byStatus[status] ?? 0,
      tone: status.toLowerCase(),
    })),
  ];

  return (
    <section className="stats" aria-label="Lead summary">
      {cards.map((card) => (
        <button
          key={card.key}
          type="button"
          className={`stat stat--${card.tone}${active === card.key ? ' is-active' : ''}`}
          onClick={() => onSelect(card.key)}
          aria-pressed={active === card.key}
        >
          <span className="stat__label">{card.label}</span>
          <span className="stat__value">{card.value}</span>
          {card.key === 'All' && (
            <span className="stat__hint">
              {money(stats?.pipelineValue ?? 0)} in pipeline · {stats?.conversionRate ?? 0}% converted
            </span>
          )}
        </button>
      ))}
    </section>
  );
}

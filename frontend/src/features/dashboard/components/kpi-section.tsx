import { Card, Metric, Title } from '@tremor/react';
import { motion } from 'motion/react';

import { Skeleton } from '@/components/ui/skeleton';
import { useStats } from '@/lib/api/stats';
import { formatCurrency, formatNumber } from '../format';
import { DashboardError } from './states';

const KPI_ACCENT = [
  'border-l-indigo-500',
  'border-l-teal-500',
  'border-l-emerald-500',
  'border-l-amber-500',
] as const;

export function KpiSection() {
  const { data, isPending, isError, error, refetch } = useStats();

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <DashboardError error={error} onRetry={() => void refetch()} />;
  }

  const stats = data.stats;
  const cards = [
    { title: 'Sessions', metric: formatNumber(stats.total_sessions) },
    { title: 'Total Cost', metric: formatCurrency(stats.total_cost) },
    { title: 'Total Tokens', metric: formatNumber(stats.total_tokens) },
    { title: 'Agents', metric: formatNumber(stats.unique_agents) },
  ];

  return (
    <section
      data-testid="kpi-section"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <Card
            className={`bg-card text-card-foreground ring-border border-l-4 ${KPI_ACCENT[index]}`}
          >
            <Title>{card.title}</Title>
            <Metric className="mt-2 tabular-nums">{card.metric}</Metric>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}

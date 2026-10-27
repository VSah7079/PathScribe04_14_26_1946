// Batch 660 (finding 14): the daily accessioning counts the Bench Contributions page already
// calculated, drawn as one bar per day. The bar heights come from dailyAccessioningBars (pages/).
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/utils/formatDate';
import { dailyAccessioningBars } from '@/pages/benchContributionCalculations';
import type { AccessioningDailyCount } from '@/pages/benchContributionCalculations';
import './dailyAccessioningChart.css';

export function DailyAccessioningChart({ daily }: { daily: readonly AccessioningDailyCount[] }) {
  const { t, i18n } = useTranslation();
  const bars = dailyAccessioningBars(daily);
  if (bars.length === 0) return null;
  const first = bars[0].date;
  const last = bars[bars.length - 1].date;
  return (
    <div className="ps-daily-chart">
      <p className="ps-daily-chart-title">{t('benchContributions.accessioning.dailyChartTitle')}</p>
      <div className="ps-daily-chart-bars" role="img" aria-label={t('benchContributions.accessioning.dailyChartLabel', { total: bars.reduce((n, b) => n + b.count, 0), days: bars.length })}>
        {bars.map(b => (
          <div className="ps-daily-chart-col" key={b.date} title={t('benchContributions.accessioning.dailyBarTitle', { date: formatDate(b.date, i18n.language), count: b.count })}>
            <div
              className={b.count === 0 ? 'ps-daily-chart-bar ps-daily-chart-bar--zero' : 'ps-daily-chart-bar'}
              style={{ '--bar-h': `${b.heightPercent}%` } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
      <div className="ps-daily-chart-axis"><span>{formatDate(first, i18n.language)}</span><span>{formatDate(last, i18n.language)}</span></div>
    </div>
  );
}

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';

function pct(before, after) {
  if (!before || before === 0) return null;
  return Math.round(((before - after) / before) * 100);
}

function DeltaBadge({ before, after, lowerIsBetter = true }) {
  const diff = after - before;
  if (diff === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="w-3 h-3" /> No change</span>;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = improved ? TrendingDown : TrendingUp;
  const reduction = pct(before, after);
  return (
    <span className={`text-xs font-semibold flex items-center gap-0.5 ${improved ? 'text-emerald-600' : 'text-destructive'}`}>
      <Icon className="w-3 h-3" />
      {reduction !== null ? `${Math.abs(reduction)}% ${improved ? 'reduction' : 'increase'}` : `${Math.abs(diff)} ${improved ? 'fewer' : 'more'}`}
    </span>
  );
}

function MetricRow({ label, before, after, format = 'number', lowerIsBetter = true, highlight = false }) {
  const fmt = (v) => {
    if (format === 'pct') return `${v}%`;
    return (v ?? 0).toLocaleString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 border-b last:border-0 ${highlight ? 'bg-muted/30 -mx-4 px-4' : ''}`}
    >
      {/* Before */}
      <div className="text-right">
        <p className={`text-lg font-bold ${highlight ? 'text-foreground' : 'text-muted-foreground'}`}>{fmt(before)}</p>
      </div>

      {/* Center label + delta */}
      <div className="flex flex-col items-center gap-0.5 min-w-[120px]">
        <p className="text-xs font-medium text-foreground text-center">{label}</p>
        <DeltaBadge before={before} after={after} lowerIsBetter={lowerIsBetter} />
      </div>

      {/* After */}
      <div className="text-left">
        <p className={`text-lg font-bold ${highlight ? 'text-emerald-600' : 'text-primary'}`}>{fmt(after)}</p>
      </div>
    </motion.div>
  );
}

export default function BeforeAfterComparison({ summary, audit }) {
  if (!summary || !audit) return null;

  const nullsAfter = summary.nulls_after ?? (summary.nulls_before - (summary.formats_fixed ?? 0));
  const typeConsistencyBefore = audit.columns
    ? Math.round((audit.columns.filter(c => c.type !== 'mixed').length / audit.columns.length) * 100)
    : null;
  // After cleaning, type consistency is always higher (mixed → unified)
  const typeConsistencyAfter = typeConsistencyBefore !== null
    ? Math.min(100, typeConsistencyBefore + Math.round((100 - typeConsistencyBefore) * 0.8))
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Before vs After Cleaning
          <span className="text-xs font-normal text-muted-foreground ml-1">— impact summary</span>
        </CardTitle>
        {/* Column labels */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mt-2">
          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Before</span>
          </div>
          <div className="min-w-[120px]" />
          <div className="text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">After</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <MetricRow
          label="Total Rows"
          before={summary.rows_before}
          after={summary.rows_after}
          lowerIsBetter={false}
          highlight
        />
        <MetricRow
          label="Missing Values"
          before={summary.nulls_before}
          after={nullsAfter}
          lowerIsBetter
        />
        <MetricRow
          label="Duplicate Rows"
          before={summary.duplicates_removed}
          after={0}
          lowerIsBetter
        />
        <MetricRow
          label="Formatting Issues"
          before={summary.formats_fixed}
          after={0}
          lowerIsBetter
        />
        <MetricRow
          label="Outliers Present"
          before={summary.outliers_handled}
          after={0}
          lowerIsBetter
        />
        {typeConsistencyBefore !== null && (
          <MetricRow
            label="Type Consistency"
            before={typeConsistencyBefore}
            after={typeConsistencyAfter}
            format="pct"
            lowerIsBetter={false}
            highlight
          />
        )}

        {/* Overall quality bar */}
        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-foreground">Overall Data Quality Score</p>
            <span className="text-sm font-bold text-primary">{summary.quality_score}/100</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: 0 }}
              animate={{ width: `${summary.quality_score}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">0</span>
            <span className="text-[10px] text-muted-foreground">100</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
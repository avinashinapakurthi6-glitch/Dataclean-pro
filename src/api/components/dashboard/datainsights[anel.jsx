import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, CartesianGrid, Legend
} from 'recharts';
import { BarChart2, ScatterChart as ScatterIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// ── helpers ────────────────────────────────────────────────────────────

function guessType(values) {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'text';
  const numRe = /^-?\d+(\.\d+)?$/;
  const numericCount = nonEmpty.slice(0, 50).filter(v => numRe.test(String(v).trim())).length;
  if (numericCount > nonEmpty.slice(0, 50).length * 0.7) return 'number';
  return 'text';
}

function buildFrequencyData(rows, col) {
  const counts = {};
  rows.forEach(row => {
    const v = String(row[col] ?? '').trim() || '(empty)';
    counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));
}

function buildScatterData(rows, colX, colY) {
  return rows
    .map(row => ({ x: parseFloat(row[colX]), y: parseFloat(row[colY]) }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y))
    .slice(0, 300);
}

// ── sub-charts ─────────────────────────────────────────────────────────

function CategoricalChart({ col, data }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-primary" />
            <CardTitle className="text-sm font-semibold truncate" title={col}>{col}</CardTitle>
            <Badge variant="secondary" className="text-[10px] ml-auto">categorical</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 28, left: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
              />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val) => [val, 'Count']}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ScatterPlot({ colX, colY, data }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <ScatterIcon className="w-3.5 h-3.5 text-secondary" />
            <CardTitle className="text-sm font-semibold truncate" title={`${colX} vs ${colY}`}>
              {colX} <span className="text-muted-foreground font-normal">vs</span> {colY}
            </CardTitle>
            <Badge variant="outline" className="text-[10px] ml-auto border-secondary text-secondary">correlation</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="x" name={colX} tick={{ fontSize: 10 }} width={30} label={{ value: colX, position: 'insideBottom', offset: -2, fontSize: 10 }} />
              <YAxis dataKey="y" name={colY} tick={{ fontSize: 10 }} width={36} label={{ value: colY, angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val, name) => [val.toLocaleString(), name === 'x' ? colX : colY]}
              />
              <Scatter data={data} fill="hsl(var(--secondary))" opacity={0.65} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── main ───────────────────────────────────────────────────────────────

const CHARTS_PER_PAGE = 6;

export default function DataInsightsPanel({ rows }) {
  const [page, setPage] = useState(0);

  const { categoricalCharts, scatterCharts } = useMemo(() => {
    if (!rows || rows.length === 0) return { categoricalCharts: [], scatterCharts: [] };

    const columns = Object.keys(rows[0]);
    const types = {};
    columns.forEach(col => {
      types[col] = guessType(rows.map(r => r[col]));
    });

    const textCols = columns.filter(col => types[col] === 'text');
    const numCols = columns.filter(col => types[col] === 'number');

    // Categorical: only show cols with 2–20 unique values (more interesting distributions)
    const categoricalCharts = textCols
      .filter(col => {
        const unique = new Set(rows.map(r => String(r[col] ?? '').trim())).size;
        return unique >= 2 && unique <= 20;
      })
      .map(col => ({ col, data: buildFrequencyData(rows, col) }));

    // Scatter: pair first 4 numeric cols together (non-repeating)
    const scatterCharts = [];
    const topNums = numCols.slice(0, 6);
    for (let i = 0; i < topNums.length - 1; i += 2) {
      const colX = topNums[i];
      const colY = topNums[i + 1];
      const data = buildScatterData(rows, colX, colY);
      if (data.length > 5) scatterCharts.push({ colX, colY, data });
    }

    return { categoricalCharts, scatterCharts };
  }, [rows]);

  const allCharts = [
    ...categoricalCharts.map(c => ({ type: 'categorical', ...c })),
    ...scatterCharts.map(c => ({ type: 'scatter', ...c })),
  ];

  if (allCharts.length === 0) return null;

  const totalPages = Math.ceil(allCharts.length / CHARTS_PER_PAGE);
  const pageCharts = allCharts.slice(page * CHARTS_PER_PAGE, (page + 1) * CHARTS_PER_PAGE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Data Insights</h2>
          <p className="text-xs text-muted-foreground">
            Auto-generated charts from your cleaned dataset · {categoricalCharts.length} distributions · {scatterCharts.length} correlations
          </p>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">{page + 1} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageCharts.map((chart, i) =>
          chart.type === 'categorical' ? (
            <CategoricalChart key={`cat-${chart.col}-${i}`} col={chart.col} data={chart.data} />
          ) : (
            <ScatterPlot key={`sct-${chart.colX}-${chart.colY}-${i}`} colX={chart.colX} colY={chart.colY} data={chart.data} />
          )
        )}
      </div>
    </div>
  );
}
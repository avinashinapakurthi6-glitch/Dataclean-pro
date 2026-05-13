import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft, ChevronRight, Search, X, Filter,
  SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────────────────

function guessColType(values) {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'text';
  const sample = nonEmpty.slice(0, 30);
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const numRe = /^-?\d+(\.\d+)?$/;
  if (sample.every(v => dateRe.test(String(v)))) return 'date';
  if (sample.filter(v => numRe.test(String(v))).length > sample.length * 0.7) return 'number';
  return 'text';
}

function getUniqueValues(rows, col) {
  return [...new Set(rows.map(r => String(r[col] ?? '')).filter(Boolean))].sort().slice(0, 50);
}

// ── Column Filter Panel ───────────────────────────────────────────────

function ColumnFilter({ col, colType, uniqueValues, filter, onChange, onClear }) {
  if (colType === 'date') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Range</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">From</label>
            <Input
              type="date"
              value={filter?.from || ''}
              onChange={e => onChange({ ...filter, from: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">To</label>
            <Input
              type="date"
              value={filter?.to || ''}
              onChange={e => onChange({ ...filter, to: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>
    );
  }

  if (colType === 'number') {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Number Range</p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Min</label>
            <Input
              type="number"
              placeholder="Min"
              value={filter?.min ?? ''}
              onChange={e => onChange({ ...filter, min: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-muted-foreground mb-0.5 block">Max</label>
            <Input
              type="number"
              placeholder="Max"
              value={filter?.max ?? ''}
              onChange={e => onChange({ ...filter, max: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>
    );
  }

  // Text — show unique value checkboxes
  const selected = filter?.values || [];
  const toggleValue = (val) => {
    const next = selected.includes(val)
      ? selected.filter(v => v !== val)
      : [...selected, val];
    onChange(next.length ? { values: next } : null);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Values</p>
      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
        {uniqueValues.map(val => (
          <label key={val} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.includes(val)}
              onChange={() => toggleValue(val)}
              className="rounded"
            />
            <span className="text-xs text-foreground group-hover:text-primary truncate max-w-[160px]" title={val}>
              {val || <span className="italic text-muted-foreground">empty</span>}
            </span>
          </label>
        ))}
        {uniqueValues.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No values</p>
        )}
      </div>
    </div>
  );
}

// ── Column Header with Filter Popover ────────────────────────────────

function FilterableHeader({ col, colType, uniqueValues, filter, onFilterChange }) {
  const [open, setOpen] = useState(false);
  const isActive = filter !== null && filter !== undefined &&
    (filter.values?.length > 0 || filter.from || filter.to || filter.min !== undefined || filter.max !== undefined);

  return (
    <TableHead className="whitespace-nowrap p-0">
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1 px-3 py-2.5 w-full text-xs font-medium hover:bg-muted/80 transition-colors rounded-sm ${isActive ? 'text-primary' : 'text-foreground'}`}
        >
          <span>{col}</span>
          {isActive ? (
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          )}
        </button>

        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 z-20 mt-1 w-56 bg-card border rounded-xl shadow-xl p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground truncate">{col}</span>
                  <button
                    onClick={() => { onFilterChange(col, null); setOpen(false); }}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear
                  </button>
                </div>

                <ColumnFilter
                  col={col}
                  colType={colType}
                  uniqueValues={uniqueValues}
                  filter={filter}
                  onChange={val => onFilterChange(col, val)}
                  onClear={() => onFilterChange(col, null)}
                />

                <Button size="sm" className="w-full h-7 text-xs" onClick={() => setOpen(false)}>
                  Apply
                </Button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </TableHead>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export default function DataPreviewTable({ rows, title, onFilteredRowsChange }) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [colFilters, setColFilters] = useState({});   // { colName: filterObj }
  const [showFilters, setShowFilters] = useState(false);

  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];

  // Pre-compute column types and unique values (memoised)
  const colMeta = useMemo(() => {
    if (!rows || rows.length === 0) return {};
    const meta = {};
    columns.forEach(col => {
      const vals = rows.map(r => r[col]);
      meta[col] = {
        type: guessColType(vals),
        unique: getUniqueValues(rows, col),
      };
    });
    return meta;
  }, [rows]);

  const activeFilterCount = Object.values(colFilters).filter(f => {
    if (!f) return false;
    if (f.values?.length) return true;
    if (f.from || f.to) return true;
    if (f.min !== undefined && f.min !== '' || f.max !== undefined && f.max !== '') return true;
    return false;
  }).length;

  // Apply search + column filters
  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    let result = rows;

    // Keyword search across all columns
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(row =>
        columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
      );
    }

    // Column-level filters
    columns.forEach(col => {
      const f = colFilters[col];
      if (!f) return;
      const type = colMeta[col].type;

      if (type === 'date' && (f.from || f.to)) {
        result = result.filter(row => {
          const v = String(row[col] ?? '');
          if (f.from && v < f.from) return false;
          if (f.to && v > f.to) return false;
          return true;
        });
      } else if (type === 'number' && (f.min !== '' || f.max !== '')) {
        result = result.filter(row => {
          const v = parseFloat(row[col]);
          if (isNaN(v)) return true;
          if (f.min !== '' && f.min !== undefined && v < parseFloat(f.min)) return false;
          if (f.max !== '' && f.max !== undefined && v > parseFloat(f.max)) return false;
          return true;
        });
      } else if (f.values?.length > 0) {
        result = result.filter(row => f.values.includes(String(row[col] ?? '')));
      }
    });

    return result;
  }, [rows, search, colFilters, colMeta]);

  // Notify parent of filtered rows for download
  useEffect(() => {
    onFilteredRowsChange?.(filteredRows);
  }, [filteredRows]);

  const handleFilterChange = useCallback((col, val) => {
    setColFilters(prev => ({ ...prev, [col]: val }));
    setPage(0);
  }, []);

  // Early return after all hooks
  if (!rows || rows.length === 0) return null;

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pageRows = filteredRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const clearAll = () => {
    setSearch('');
    setColFilters({});
    setPage(0);
  };

  const hasAnyFilter = search.trim() || activeFilterCount > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasAnyFilter
                ? <span><span className="text-primary font-semibold">{filteredRows.length}</span> of {rows.length} rows match</span>
                : <span>{rows.length} rows × {columns.length} columns</span>
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAnyFilter && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7 text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3 mr-1" /> Clear all
              </Button>
            )}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowFilters(s => !s)}
            >
              <SlidersHorizontal className="w-3 h-3 mr-1.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-1.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search all columns…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-8 h-8 text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(0); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Active filter badges */}
        <AnimatePresence>
          {activeFilterCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1.5 mt-1"
            >
              {columns.map(col => {
                const f = colFilters[col];
                if (!f) return null;
                const type = colMeta[col].type;
                let label = '';
                if (type === 'date') label = `${col}: ${f.from || '…'} → ${f.to || '…'}`;
                else if (type === 'number') label = `${col}: ${f.min ?? '…'} – ${f.max ?? '…'}`;
                else if (f.values?.length) label = `${col}: ${f.values.slice(0, 2).join(', ')}${f.values.length > 2 ? ` +${f.values.length - 2}` : ''}`;
                else return null;
                return (
                  <Badge key={col} variant="secondary" className="text-[10px] gap-1 pl-2 pr-1 py-0.5">
                    {label}
                    <button onClick={() => handleFilterChange(col, null)}>
                      <X className="w-2.5 h-2.5 hover:text-destructive" />
                    </button>
                  </Badge>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Table */}
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map(col => (
                  showFilters ? (
                    <FilterableHeader
                      key={col}
                      col={col}
                      colType={colMeta[col].type}
                      uniqueValues={colMeta[col].unique}
                      filter={colFilters[col]}
                      onFilterChange={handleFilterChange}
                    />
                  ) : (
                    <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                  )
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-10 text-muted-foreground text-sm">
                    No rows match your search or filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                    {columns.map(col => {
                      const val = row[col];
                      const strVal = val === null || val === undefined ? '' : String(val);
                      // Highlight keyword match
                      const q = search.trim().toLowerCase();
                      const matchIdx = q ? strVal.toLowerCase().indexOf(q) : -1;
                      return (
                        <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate py-2">
                          {val === null || val === undefined ? (
                            <span className="text-muted-foreground/40 italic">null</span>
                          ) : matchIdx >= 0 ? (
                            <>
                              {strVal.slice(0, matchIdx)}
                              <mark className="bg-amber-200 text-amber-900 rounded-sm px-0.5">
                                {strVal.slice(matchIdx, matchIdx + q.length)}
                              </mark>
                              {strVal.slice(matchIdx + q.length)}
                            </>
                          ) : strVal}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {safePage + 1} of {totalPages}
              <span className="ml-2 text-muted-foreground/60">
                ({filteredRows.length} rows)
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
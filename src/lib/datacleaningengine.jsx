// @ts-nocheck
import * as XLSX from 'xlsx';
/**
 * Data Cleaning Engine
 * 
 * This module contains all the cleaning logic that runs in the browser.
 * It parses CSV/Excel/JSON data (as arrays of objects), audits it, cleans it,
 * and produces summary statistics and chart data.
 * 
 * Usage:
 *   import { auditData, cleanData } from '@/lib/dataCleaningEngine';
 *   const audit = auditData(rows);
 *   const { cleanedRows, log, summary, chartData } = cleanData(rows, audit);
 */

// ─── HELPERS ─────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString();
}

/** Detect if a string looks like a date */
function looksLikeDate(val) {
  if (typeof val !== 'string') return false;
  // Common date patterns
  const datePatterns = [
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,           // 2024-01-15
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,           // 01/15/2024 or 1-15-24
    /^\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{2,4}$/i,
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{2,4}$/i,
  ];
  return datePatterns.some(p => p.test(val.trim()));
}

/** Detect if a value looks numeric (possibly with units) */
function looksLikeNumber(val) {
  if (typeof val === 'number') return true;
  if (typeof val !== 'string') return false;
  // Strip common units/symbols
  const cleaned = val.replace(/[$€£¥%,\s]/g, '').replace(/\s*(kg|lbs?|oz|ml|cm|mm|m|ft|in|units?|pcs?)$/i, '');
  return !isNaN(parseFloat(cleaned)) && isFinite(cleaned);
}

/** Extract numeric value from string with units */
function extractNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return NaN;
  const cleaned = val.replace(/[$€£¥%,\s]/g, '').replace(/\s*(kg|lbs?|oz|ml|cm|mm|m|ft|in|units?|pcs?)$/i, '');
  return parseFloat(cleaned);
}

/** Guess the data type of a column based on sample values */
function guessColumnType(values) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'empty';
  
  const sample = nonNull.slice(0, 50);
  const dateCount = sample.filter(looksLikeDate).length;
  const numberCount = sample.filter(looksLikeNumber).length;
  
  if (dateCount > sample.length * 0.7) return 'date';
  if (numberCount > sample.length * 0.7) return 'number';
  return 'text';
}


// ─── AUDIT ───────────────────────────────────────────────────────────

/**
 * Performs an initial audit of the data.
 * Returns shape, column info, null counts, duplicate count, and samples.
 */
export function auditData(rows) {
  if (!rows || rows.length === 0) {
    return {
      row_count: 0,
      column_count: 0,
      columns: [],
      duplicate_rows: 0,
      total_nulls: 0
    };
  }

  const columns = Object.keys(rows[0]);
  const columnAudits = columns.map(col => {
    const values = rows.map(r => r[col]);
    const nullCount = values.filter(v => v === null || v === undefined || v === '' || v === 'null' || v === 'NULL' || v === 'N/A' || v === 'n/a' || v === 'NA' || v === '-').length;
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueCount = new Set(nonNullValues.map(String)).size;
    const sampleVals = nonNullValues.slice(0, 5).map(String);
    const type = guessColumnType(values);

    return {
      name: col,
      type,
      null_count: nullCount,
      unique_count: uniqueCount,
      sample_values: sampleVals
    };
  });

  // Count duplicate rows by JSON stringifying
  const seen = new Set();
  let dupeCount = 0;
  rows.forEach(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) dupeCount++;
    else seen.add(key);
  });

  const totalNulls = columnAudits.reduce((sum, c) => sum + c.null_count, 0);

  return {
    row_count: rows.length,
    column_count: columns.length,
    columns: columnAudits,
    duplicate_rows: dupeCount,
    total_nulls: totalNulls
  };
}


// ─── CLEANING FUNCTIONS ──────────────────────────────────────────────

/**
 * Step 1: Remove exact duplicate rows.
 */
function removeDuplicates(rows) {
  const seen = new Set();
  const cleaned = [];
  rows.forEach(row => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) {
      seen.add(key);
      cleaned.push(row);
    }
  });
  return cleaned;
}

/**
 * Step 2: Handle missing values.
 * - For numeric columns: fill with median
 * - For text columns: fill with "Unknown"
 * - For date columns: leave blank (mark as missing)
 */
function handleMissingValues(rows, columnAudits) {
  const columns = Object.keys(rows[0] || {});
  let fixedCount = 0;

  // Calculate medians for numeric columns
  const medians = {};
  columnAudits.filter(c => c.type === 'number').forEach(col => {
    const nums = rows
      .map(r => extractNumber(r[col.name]))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    if (nums.length > 0) {
      const mid = Math.floor(nums.length / 2);
      medians[col.name] = nums.length % 2 === 0 
        ? (nums[mid - 1] + nums[mid]) / 2 
        : nums[mid];
    }
  });

  const cleaned = rows.map(row => {
    const newRow = { ...row };
    columns.forEach(col => {
      const val = newRow[col];
      const isNull = val === null || val === undefined || val === '' || val === 'null' || val === 'NULL' || val === 'N/A' || val === 'n/a' || val === 'NA' || val === '-';
      
      if (isNull) {
        const colAudit = columnAudits.find(c => c.name === col);
        if (colAudit?.type === 'number' && medians[col] !== undefined) {
          newRow[col] = Math.round(medians[col] * 100) / 100;
          fixedCount++;
        } else if (colAudit?.type === 'text') {
          newRow[col] = 'Unknown';
          fixedCount++;
        } else if (colAudit?.type === 'date') {
          newRow[col] = '';
          fixedCount++;
        }
      }
    });
    return newRow;
  });

  return { rows: cleaned, fixedCount };
}

/**
 * Step 3: Fix inconsistent text casing — title case for text columns.
 */
function fixTextCasing(rows, columnAudits) {
  let fixedCount = 0;
  const textCols = columnAudits.filter(c => c.type === 'text').map(c => c.name);

  const cleaned = rows.map(row => {
    const newRow = { ...row };
    textCols.forEach(col => {
      const val = newRow[col];
      if (typeof val === 'string' && val.length > 0 && val !== 'Unknown') {
        const trimmed = val.trim();
        // Title case
        const titled = trimmed.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w+/g, w => w.toLowerCase());
        if (titled !== val) {
          newRow[col] = titled;
          fixedCount++;
        } else {
          newRow[col] = trimmed;
        }
      }
    });
    return newRow;
  });

  return { rows: cleaned, fixedCount };
}

/**
 * Step 4: Standardize date formats to YYYY-MM-DD.
 */
function fixDateFormats(rows, columnAudits) {
  let fixedCount = 0;
  const dateCols = columnAudits.filter(c => c.type === 'date').map(c => c.name);

  const cleaned = rows.map(row => {
    const newRow = { ...row };
    dateCols.forEach(col => {
      const val = newRow[col];
      if (typeof val === 'string' && val.trim().length > 0) {
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          const iso = parsed.toISOString().split('T')[0];
          if (iso !== val) {
            newRow[col] = iso;
            fixedCount++;
          }
        }
      }
    });
    return newRow;
  });

  return { rows: cleaned, fixedCount };
}

/**
 * Step 5: Standardize numeric units — strip symbols, convert to plain numbers.
 */
function fixNumericUnits(rows, columnAudits) {
  let fixedCount = 0;
  const numCols = columnAudits.filter(c => c.type === 'number').map(c => c.name);

  const cleaned = rows.map(row => {
    const newRow = { ...row };
    numCols.forEach(col => {
      const val = newRow[col];
      if (typeof val === 'string') {
        const num = extractNumber(val);
        if (!isNaN(num)) {
          newRow[col] = Math.round(num * 100) / 100;
          fixedCount++;
        }
      }
    });
    return newRow;
  });

  return { rows: cleaned, fixedCount };
}

/**
 * Step 6: Handle outliers using IQR method.
 * Values beyond 1.5×IQR are capped to the fence values.
 */
function handleOutliers(rows, columnAudits) {
  let fixedCount = 0;
  const numCols = columnAudits.filter(c => c.type === 'number').map(c => c.name);

  // Calculate IQR for each numeric column
  const bounds = {};
  numCols.forEach(col => {
    const nums = rows
      .map(r => typeof r[col] === 'number' ? r[col] : extractNumber(r[col]))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    
    if (nums.length >= 4) {
      const q1 = nums[Math.floor(nums.length * 0.25)];
      const q3 = nums[Math.floor(nums.length * 0.75)];
      const iqr = q3 - q1;
      bounds[col] = {
        lower: q1 - 1.5 * iqr,
        upper: q3 + 1.5 * iqr
      };
    }
  });

  const cleaned = rows.map(row => {
    const newRow = { ...row };
    numCols.forEach(col => {
      if (bounds[col] && typeof newRow[col] === 'number') {
        if (newRow[col] < bounds[col].lower) {
          newRow[col] = Math.round(bounds[col].lower * 100) / 100;
          fixedCount++;
        } else if (newRow[col] > bounds[col].upper) {
          newRow[col] = Math.round(bounds[col].upper * 100) / 100;
          fixedCount++;
        }
      }
    });
    return newRow;
  });

  return { rows: cleaned, fixedCount };
}


// ─── MAIN PIPELINE ──────────────────────────────────────────────────

/**
 * Runs the full cleaning pipeline.
 * Returns cleaned rows, a step-by-step log, summary stats, and chart data.
 */
export function cleanData(rows, audit) {
  const log = [];
  let currentRows = [...rows.map(r => ({ ...r }))];
  const columnAudits = audit.columns;

  // Step 1: Remove duplicates
  const beforeDupes = currentRows.length;
  currentRows = removeDuplicates(currentRows);
  const dupesRemoved = beforeDupes - currentRows.length;
  log.push({
    step: 'Remove Duplicates',
    description: `Found and removed ${dupesRemoved} duplicate rows`,
    rows_before: beforeDupes,
    rows_after: currentRows.length,
    items_fixed: dupesRemoved,
    timestamp: timestamp()
  });

  // Step 2: Handle missing values
  const beforeMissing = currentRows.length;
  const missingResult = handleMissingValues(currentRows, columnAudits);
  currentRows = missingResult.rows;
  log.push({
    step: 'Fill Missing Values',
    description: `Filled ${missingResult.fixedCount} missing values (median for numbers, "Unknown" for text)`,
    rows_before: beforeMissing,
    rows_after: currentRows.length,
    items_fixed: missingResult.fixedCount,
    timestamp: timestamp()
  });

  // Step 3: Fix text casing
  const casingResult = fixTextCasing(currentRows, columnAudits);
  currentRows = casingResult.rows;
  log.push({
    step: 'Standardize Text Casing',
    description: `Normalized ${casingResult.fixedCount} text values to title case`,
    rows_before: currentRows.length,
    rows_after: currentRows.length,
    items_fixed: casingResult.fixedCount,
    timestamp: timestamp()
  });

  // Step 4: Fix date formats
  const dateResult = fixDateFormats(currentRows, columnAudits);
  currentRows = dateResult.rows;
  log.push({
    step: 'Standardize Date Formats',
    description: `Standardized ${dateResult.fixedCount} dates to YYYY-MM-DD format`,
    rows_before: currentRows.length,
    rows_after: currentRows.length,
    items_fixed: dateResult.fixedCount,
    timestamp: timestamp()
  });

  // Step 5: Fix numeric units
  const unitResult = fixNumericUnits(currentRows, columnAudits);
  currentRows = unitResult.rows;
  log.push({
    step: 'Standardize Numeric Units',
    description: `Cleaned ${unitResult.fixedCount} numeric values (removed symbols/units)`,
    rows_before: currentRows.length,
    rows_after: currentRows.length,
    items_fixed: unitResult.fixedCount,
    timestamp: timestamp()
  });

  // Step 6: Handle outliers
  const outlierResult = handleOutliers(currentRows, columnAudits);
  currentRows = outlierResult.rows;
  log.push({
    step: 'Handle Outliers',
    description: `Capped ${outlierResult.fixedCount} outlier values using IQR method`,
    rows_before: currentRows.length,
    rows_after: currentRows.length,
    items_fixed: outlierResult.fixedCount,
    timestamp: timestamp()
  });

  // Calculate after-cleaning audit
  const afterAudit = auditData(currentRows);
  const totalFixed = missingResult.fixedCount + casingResult.fixedCount + dateResult.fixedCount + unitResult.fixedCount;

  // Data quality score: 0–100
  const totalCells = afterAudit.row_count * afterAudit.column_count;
  const completeness = totalCells > 0 ? ((totalCells - afterAudit.total_nulls) / totalCells) * 100 : 100;
  const consistency = totalFixed > 0 ? Math.max(0, 100 - (totalFixed / totalCells) * 50) : 100;
  const qualityScore = Math.round((completeness * 0.6 + consistency * 0.4));

  const summary = {
    rows_before: audit.row_count,
    rows_after: afterAudit.row_count,
    nulls_before: audit.total_nulls,
    nulls_after: afterAudit.total_nulls,
    duplicates_removed: dupesRemoved,
    formats_fixed: totalFixed,
    outliers_handled: outlierResult.fixedCount,
    quality_score: Math.min(100, qualityScore)
  };

  // Chart data
  const columnNullDistribution = audit.columns.map((col, i) => ({
    column: col.name.length > 15 ? col.name.substring(0, 12) + '...' : col.name,
    nulls_before: col.null_count,
    nulls_after: afterAudit.columns[i]?.null_count || 0
  })).slice(0, 10);

  const typeMap = {};
  afterAudit.columns.forEach(c => {
    typeMap[c.type] = (typeMap[c.type] || 0) + 1;
  });
  const dataTypeBreakdown = Object.entries(typeMap).map(([type, count]) => ({ type, count }));

  const cleaningImpact = log.map(l => ({
    step: l.step.length > 15 ? l.step.substring(0, 12) + '...' : l.step,
    impact: l.items_fixed
  }));

  return {
    cleanedRows: currentRows,
    log,
    summary,
    chartData: {
      column_null_distribution: columnNullDistribution,
      data_type_breakdown: dataTypeBreakdown,
      cleaning_impact: cleaningImpact
    }
  };
}


// ─── CSV PARSER ──────────────────────────────────────────────────────

/**
 * Parse CSV text into an array of objects.
 */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Simple CSV parser that handles quoted fields
  function parseLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }
  return rows;
}

export function parseExcel(data) {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function parseJSON(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([key, value]) => ({ key, value }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Convert array of objects to CSV string.
 */
export function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  rows.forEach(row => {
    const vals = headers.map(h => {
      const v = row[h] === null || row[h] === undefined ? '' : String(row[h]);
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    });
    lines.push(vals.join(','));
  });
  return lines.join('\n');
}

/**
 * Generate synthetic sample data for demo purposes.
 */
export function generateSampleData(rowCount = 100) {
  const categories = ['Electronics', 'clothing', 'FURNITURE', 'food & Beverage', 'Books'];
  const cities = ['New York', 'los angeles', 'CHICAGO', 'houston', 'Phoenix'];
  const statuses = ['Active', 'INACTIVE', 'pending', 'Completed', null];
  
  const rows = [];
  for (let i = 0; i < rowCount; i++) {
    const isOutlier = Math.random() < 0.05;
    const hasMissing = Math.random() < 0.15;
    const isDuplicate = Math.random() < 0.08 && rows.length > 0;

    if (isDuplicate) {
      rows.push({ ...rows[Math.floor(Math.random() * rows.length)] });
      continue;
    }

    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    const dateFormats = [
      `2024-${month}-${day}`,
      `${month}/${day}/2024`,
      `${day}-${month}-2024`,
      `2024/${month}/${day}`
    ];

    rows.push({
      order_id: `ORD-${String(i + 1).padStart(4, '0')}`,
      date: hasMissing && Math.random() < 0.3 ? '' : dateFormats[Math.floor(Math.random() * dateFormats.length)],
      category: hasMissing && Math.random() < 0.2 ? 'N/A' : categories[Math.floor(Math.random() * categories.length)],
      city: hasMissing && Math.random() < 0.2 ? null : cities[Math.floor(Math.random() * cities.length)],
      quantity: isOutlier ? Math.floor(Math.random() * 5000) + 1000 : Math.floor(Math.random() * 50) + 1,
      unit_price: hasMissing && Math.random() < 0.1 ? '' : `$${(isOutlier ? Math.random() * 5000 + 500 : Math.random() * 200 + 5).toFixed(2)}`,
      total: isOutlier ? `$${(Math.random() * 50000 + 5000).toFixed(2)}` : `$${(Math.random() * 2000 + 10).toFixed(2)}`,
      status: statuses[Math.floor(Math.random() * statuses.length)]
    });
  }
  return rows;
}
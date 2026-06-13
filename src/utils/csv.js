// CSV export helper for the admin/merchant "download for the accountant" feature.
// RFC-4180 escaping + a UTF-8 BOM so Excel renders Arabic (vendor names,
// addresses) correctly instead of mojibake.

function cell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Quote when the cell contains a comma, quote, newline or leading/trailing
  // space; double up any embedded quotes.
  if (/[",\n\r]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// columns: [{ header, value: (row) => any }]
function toCSV(rows, columns) {
  const header = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => cell(c.value(row))).join(','));
  // Lead with a UTF-8 BOM (﻿) so Excel renders Arabic; CRLF line endings.
  return '﻿' + [header, ...body].join('\r\n') + '\r\n';
}

// Send rows as a downloadable CSV attachment.
function sendCSV(res, filename, rows, columns) {
  const safeName = String(filename).replace(/[^\w.\-]+/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  return res.status(200).send(toCSV(rows, columns));
}

// ISO 8601 (sortable, unambiguous) for audit timestamps; '' when missing.
const iso = (d) => (d ? new Date(d).toISOString() : '');
// Plain number (no currency symbol/grouping) so the accountant can sum in a sheet.
const num = (n) => (n === null || n === undefined || n === '' ? '' : Number(n));

module.exports = { toCSV, sendCSV, iso, num };

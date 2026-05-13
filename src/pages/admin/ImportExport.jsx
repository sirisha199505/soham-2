import { useState, useRef, useEffect } from 'react';
import {
  Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X,
  FileText, Eye, ChevronDown, ChevronUp, Table, Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../utils/api';

// ─── CSV Utilities ────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = splitCSVRow(lines[0]);
  const rows = lines.slice(1).filter(l => l.trim()).map(l => {
    const vals = splitCSVRow(l);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (vals[i] || '').trim(); });
    return row;
  });
  return { headers, rows };
}

function splitCSVRow(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && !inQ) { inQ = true; }
    else if (c === '"' && inQ) {
      if (line[i + 1] === '"') { cur += '"'; i++; }
      else { inQ = false; }
    } else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

function toCSV(headers, rows) {
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Column headers and descriptions ─────────────────────────────────────
const QUESTION_HEADERS = [
  'category', 'type', 'difficulty', 'text',
  'option_a', 'option_b', 'option_c', 'option_d', 'correct_option',
  'pair1_left', 'pair1_right', 'pair2_left', 'pair2_right',
  'pair3_left', 'pair3_right', 'pair4_left', 'pair4_right',
  'image_url', 'explanation',
];

const HEADER_META = {
  category:       { req: 'always', note: 'robotics · chemistry · physics · mathematics' },
  type:           { req: 'always', note: 'mcq · match · image · truefalse' },
  difficulty:     { req: 'always', note: 'easy · medium · hard' },
  text:           { req: 'always', note: 'Question text' },
  option_a:       { req: 'mcq/image', note: 'Option A text' },
  option_b:       { req: 'mcq/image', note: 'Option B text' },
  option_c:       { req: 'mcq/image', note: 'Option C text' },
  option_d:       { req: 'mcq/image', note: 'Option D text' },
  correct_option: { req: 'mcq/image', note: 'A / B / C / D  (True=A, False=B for truefalse)' },
  pair1_left:     { req: 'match', note: 'Left label of pair 1' },
  pair1_right:    { req: 'match', note: 'Right label of pair 1' },
  pair2_left:     { req: 'match', note: 'Left label of pair 2' },
  pair2_right:    { req: 'match', note: 'Right label of pair 2' },
  pair3_left:     { req: 'match', note: 'Left label of pair 3 (optional)' },
  pair3_right:    { req: 'match', note: 'Right label of pair 3 (optional)' },
  pair4_left:     { req: 'match', note: 'Left label of pair 4 (optional)' },
  pair4_right:    { req: 'match', note: 'Right label of pair 4 (optional)' },
  image_url:      { req: 'image', note: 'Public image URL for image-based questions' },
  explanation:    { req: 'optional', note: 'Shown after the student answers' },
};

const SAMPLE_ROWS = [
  {
    category: 'robotics', type: 'mcq', difficulty: 'easy',
    text: 'What does CPU stand for?',
    option_a: 'Central Processing Unit', option_b: 'Core Power Unit',
    option_c: 'Computer Protocol Unit', option_d: 'Central Program Utility',
    correct_option: 'A',
    pair1_left: '', pair1_right: '', pair2_left: '', pair2_right: '',
    pair3_left: '', pair3_right: '', pair4_left: '', pair4_right: '',
    image_url: '', explanation: 'CPU stands for Central Processing Unit.',
  },
  {
    category: 'chemistry', type: 'match', difficulty: 'medium',
    text: 'Match the element to its symbol:',
    option_a: '', option_b: '', option_c: '', option_d: '', correct_option: '',
    pair1_left: 'Gold', pair1_right: 'Au',
    pair2_left: 'Iron', pair2_right: 'Fe',
    pair3_left: 'Sodium', pair3_right: 'Na',
    pair4_left: 'Potassium', pair4_right: 'K',
    image_url: '', explanation: 'Chemical symbols of common elements.',
  },
  {
    category: 'physics', type: 'truefalse', difficulty: 'easy',
    text: 'Light travels faster than sound.',
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_option: 'A',
    pair1_left: '', pair1_right: '', pair2_left: '', pair2_right: '',
    pair3_left: '', pair3_right: '', pair4_left: '', pair4_right: '',
    image_url: '', explanation: 'Light speed (~3×10⁸ m/s) >> sound speed (~343 m/s).',
  },
];

// ─── Row → Question object ─────────────────────────────────────────────────
function rowToQuestion(row) {
  const q = {
    category:    (row.category    || '').toLowerCase().trim() || 'robotics',
    type:        (row.type        || 'mcq').toLowerCase().trim(),
    difficulty:  (row.difficulty  || 'easy').toLowerCase().trim(),
    text:        (row.text        || '').trim(),
    explanation: (row.explanation || '').trim(),
  };

  const VALID_CATS  = ['robotics', 'chemistry', 'physics', 'mathematics'];
  const VALID_TYPES = ['mcq', 'match', 'image', 'truefalse', 'tf'];
  if (!VALID_CATS.includes(q.category))  q.category  = 'robotics';
  if (!VALID_TYPES.includes(q.type))     q.type      = 'mcq';
  if (q.type === 'tf')                   q.type      = 'truefalse';
  if (!['easy','medium','hard'].includes(q.difficulty)) q.difficulty = 'easy';

  if (q.type === 'match') {
    q.pairs = [
      { left: row.pair1_left || '', right: row.pair1_right || '' },
      { left: row.pair2_left || '', right: row.pair2_right || '' },
      { left: row.pair3_left || '', right: row.pair3_right || '' },
      { left: row.pair4_left || '', right: row.pair4_right || '' },
    ].filter(p => p.left || p.right);
  } else if (q.type === 'truefalse') {
    q.options = ['True', 'False'];
    const letter = (row.correct_option || 'A').toUpperCase();
    q.correct = letter === 'B' ? 1 : 0;
    q.correctAnswer = q.correct;
  } else {
    q.options = [
      row.option_a || '', row.option_b || '',
      row.option_c || '', row.option_d || '',
    ];
    const corrMap = { A: 0, B: 1, C: 2, D: 3 };
    const letter  = (row.correct_option || 'A').toUpperCase();
    q.correct      = corrMap[letter] ?? 0;
    q.correctAnswer = q.correct;
    if (q.type === 'image') q.imageUrl = (row.image_url || '').trim();
  }
  return q;
}

function validateRow(row) {
  const errs = [];
  if (!(row.text || '').trim()) errs.push('Missing question text');
  const type = (row.type || '').toLowerCase();
  if (type === 'match') {
    if (!row.pair1_left || !row.pair1_right) errs.push('Pair 1 incomplete');
    if (!row.pair2_left || !row.pair2_right) errs.push('Pair 2 incomplete');
  } else if (type !== 'truefalse' && type !== 'tf') {
    if (!row.option_a || !row.option_b || !row.option_c || !row.option_d)
      errs.push('Options A/B/C/D required');
    if (!row.correct_option) errs.push('correct_option required (A/B/C/D)');
  }
  return errs;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function ImportExport() {
  const [file,          setFile]          = useState(null);
  const [parsed,        setParsed]        = useState(null);
  const [importing,     setImporting]     = useState(false);
  const [importDone,    setImportDone]    = useState(null);
  const [dragging,      setDragging]      = useState(false);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [headersOpen,   setHeadersOpen]   = useState(false);
  const [toast,         setToast]         = useState('');
  const [toastErr,      setToastErr]      = useState(false);
  const [bankSummary,   setBankSummary]   = useState(null);
  const [exporting,     setExporting]     = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    api.getQuestionBank()
      .then(bank => setBankSummary(bank))
      .catch(() => {});
  }, [importDone]);

  const showToast = (msg, err = false) => {
    setToast(msg); setToastErr(err);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Parse uploaded file (CSV or Excel) ──────────────────────────────────
  const processFile = async (f) => {
    setFile(f); setParsed(null); setImportDone(null);
    try {
      const isExcel = /\.(xlsx|xls)$/i.test(f.name);
      let rows;
      if (isExcel) {
        const buffer = await f.arrayBuffer();
        const wb     = XLSX.read(buffer, { type: 'array' });
        const ws     = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
        // Normalise header keys to lowercase with underscores (match CSV headers)
        rows = rows.map(r => {
          const out = {};
          Object.keys(r).forEach(k => { out[k.toLowerCase().replace(/\s+/g, '_')] = r[k]; });
          return out;
        });
      } else {
        const text = await f.text();
        rows = parseCSV(text).rows;
      }
      setParsed(rows.map(row => ({ row, errors: validateRow(row) })));
    } catch (e) {
      showToast('Could not read file: ' + e.message, true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  // ── Send valid rows to API ───────────────────────────────────────────────
  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    const valid = parsed.filter(x => x.errors.length === 0).map(x => rowToQuestion(x.row));
    try {
      await api.seedQuestions(valid);
      setImportDone({ added: valid.length, skipped: parsed.length - valid.length });
      showToast(`${valid.length} question${valid.length !== 1 ? 's' : ''} imported!`);
    } catch (e) {
      showToast('Import failed: ' + e.message, true);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null); setParsed(null); setImportDone(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Template downloads ───────────────────────────────────────────────────
  const exportCsvTemplate = () => {
    downloadCSV('question_template.csv', toCSV(QUESTION_HEADERS, SAMPLE_ROWS));
    showToast('CSV template downloaded!');
  };

  const exportXlsxTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_ROWS, { header: QUESTION_HEADERS });
    // Bold + wider columns
    ws['!cols'] = QUESTION_HEADERS.map(h =>
      ({ wch: Math.max(h.length + 2, 18) })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'question_template.xlsx');
    showToast('Excel template downloaded!');
  };

  // ── Export all questions from API ────────────────────────────────────────
  const exportAllQuestions = async () => {
    setExporting(true);
    try {
      const bank = await api.getQuestionBank();
      const rows = Object.values(bank).flat().map(q => ({
        category:       q.category     || '',
        type:           q.type         || 'mcq',
        difficulty:     q.difficulty   || 'easy',
        text:           q.text         || '',
        option_a:       (q.options || [])[0] || '',
        option_b:       (q.options || [])[1] || '',
        option_c:       (q.options || [])[2] || '',
        option_d:       (q.options || [])[3] || '',
        correct_option: ['A','B','C','D'][q.correct] || '',
        pair1_left:  (q.pairs || [])[0]?.left  || '',
        pair1_right: (q.pairs || [])[0]?.right || '',
        pair2_left:  (q.pairs || [])[1]?.left  || '',
        pair2_right: (q.pairs || [])[1]?.right || '',
        pair3_left:  (q.pairs || [])[2]?.left  || '',
        pair3_right: (q.pairs || [])[2]?.right || '',
        pair4_left:  (q.pairs || [])[3]?.left  || '',
        pair4_right: (q.pairs || [])[3]?.right || '',
        image_url:   q.imageUrl    || '',
        explanation: q.explanation || '',
      }));
      downloadCSV('all_questions.csv', toCSV(QUESTION_HEADERS, rows));
      showToast(`${rows.length} questions exported!`);
    } catch (e) {
      showToast('Export failed: ' + e.message, true);
    } finally {
      setExporting(false);
    }
  };

  const validCount   = parsed ? parsed.filter(x => x.errors.length === 0).length : 0;
  const invalidCount = parsed ? parsed.filter(x => x.errors.length > 0).length   : 0;

  const CATEGORIES = ['robotics', 'chemistry', 'physics', 'mathematics'];
  const CAT_COLOR  = { robotics: '#3BC0EF', chemistry: '#FAAB34', physics: '#8B5CF6', mathematics: '#10B981' };

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg border ${
          toastErr
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          {toastErr ? <AlertTriangle size={14}/> : <CheckCircle size={14}/>} {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Import / Export</h1>
        <p className="text-sm text-slate-400 mt-0.5">Bulk import questions from Excel or CSV · export question bank data</p>
      </div>

      {/* ── Header Reference ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setHeadersOpen(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info size={16} className="text-indigo-500"/>
            <span className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk' }}>
              Expected Column Headers
            </span>
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
              {QUESTION_HEADERS.length} columns
            </span>
          </div>
          {headersOpen ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
        </button>

        {headersOpen && (
          <div className="border-t border-slate-100 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {['Column Name','Required For','Description'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-bold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {QUESTION_HEADERS.map((h, i) => {
                  const meta = HEADER_META[h] || {};
                  const reqColor = meta.req === 'always' ? 'text-red-600 bg-red-50 border-red-100'
                    : meta.req === 'optional' ? 'text-slate-400 bg-slate-50 border-slate-100'
                    : 'text-amber-600 bg-amber-50 border-amber-100';
                  return (
                    <tr key={h} className={`border-t border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-2 font-mono font-bold text-indigo-700">{h}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${reqColor}`}>
                          {meta.req || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{meta.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Import ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Upload size={15} className="text-indigo-500"/>
              </div>
              <h2 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Import Questions</h2>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700 space-y-1">
              <p className="font-bold">Supported formats: .xlsx · .xls · .csv</p>
              <p>First row must contain the exact column header names shown above.</p>
              <p>Rows with validation errors are automatically skipped on import.</p>
            </div>

            {!file ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet size={32} className={`mx-auto mb-3 ${dragging ? 'text-indigo-500' : 'text-slate-400'}`}/>
                <p className="font-semibold text-slate-700 text-sm">
                  {dragging ? 'Drop to upload' : 'Click or drag file here'}
                </p>
                <p className="text-xs text-slate-400 mt-1">.xlsx · .xls · .csv</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={e => e.target.files[0] && processFile(e.target.files[0])}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <FileText size={20} className="text-indigo-500 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400">
                    <X size={14}/>
                  </button>
                </div>

                {parsed && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Total',  val: parsed.length, color: 'text-slate-700', bg: 'bg-slate-50' },
                        { label: 'Valid',  val: validCount,    color: 'text-green-700', bg: 'bg-green-50' },
                        { label: 'Errors', val: invalidCount,  color: 'text-red-700',   bg: 'bg-red-50'   },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-xl p-2`}>
                          <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                          <p className="text-[10px] text-slate-400">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setPreviewOpen(p => !p)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <span className="flex items-center gap-1.5"><Eye size={13}/> Preview Rows</span>
                      {previewOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                    </button>

                    {previewOpen && (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-52">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              {['#', 'Category', 'Type', 'Question', 'Status'].map(h => (
                                <th key={h} className="px-2 py-1.5 text-left font-bold text-slate-500">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {parsed.map(({ row, errors }, i) => (
                              <tr key={i} className={`border-t border-slate-100 ${errors.length ? 'bg-red-50' : ''}`}>
                                <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                                <td className="px-2 py-1.5 font-medium text-slate-600">{row.category}</td>
                                <td className="px-2 py-1.5 text-slate-500">{row.type}</td>
                                <td className="px-2 py-1.5 text-slate-600 max-w-[140px] truncate">{row.text}</td>
                                <td className="px-2 py-1.5">
                                  {errors.length === 0
                                    ? <span className="text-green-600 font-bold">✓ OK</span>
                                    : <span className="text-red-500 font-bold" title={errors.join(', ')}>✕ {errors[0]}</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {importDone ? (
                      <div className="bg-green-50 rounded-xl p-3 flex items-center gap-2">
                        <CheckCircle size={16} className="text-green-600 shrink-0"/>
                        <p className="text-sm text-green-700 font-semibold">
                          {importDone.added} imported!
                          {importDone.skipped > 0 && ` (${importDone.skipped} skipped)`}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleImport}
                        disabled={importing || validCount === 0}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
                      >
                        {importing
                          ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"/> Importing…</>
                          : <><Upload size={15}/> Import {validCount} Question{validCount !== 1 ? 's' : ''}</>}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Template download buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={exportXlsxTemplate}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-green-300 text-green-700 text-xs font-semibold hover:bg-green-50 transition-colors"
              >
                <Download size={13}/> Excel Template
              </button>
              <button
                onClick={exportCsvTemplate}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-xs font-semibold hover:bg-indigo-50 transition-colors"
              >
                <Download size={13}/> CSV Template
              </button>
            </div>
          </div>
        </div>

        {/* ── Export & Summary ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                <Download size={15} className="text-green-500"/>
              </div>
              <h2 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Export Data</h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={exportAllQuestions}
                disabled={exporting}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group disabled:opacity-60"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50">
                  <Table size={18} className="text-indigo-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">All Questions (CSV)</p>
                  <p className="text-xs text-slate-400 mt-0.5">Full question bank from the API</p>
                </div>
                {exporting
                  ? <span className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full"/>
                  : <Download size={15} className="text-slate-400 group-hover:text-slate-600 shrink-0"/>}
              </button>

              <button
                onClick={exportXlsxTemplate}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-green-50">
                  <FileSpreadsheet size={18} className="text-green-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">Excel Template (.xlsx)</p>
                  <p className="text-xs text-slate-400 mt-0.5">3 sample rows with all column headers</p>
                </div>
                <Download size={15} className="text-slate-400 group-hover:text-slate-600 shrink-0"/>
              </button>

              <button
                onClick={exportCsvTemplate}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50">
                  <FileText size={18} className="text-amber-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">CSV Template</p>
                  <p className="text-xs text-slate-400 mt-0.5">Blank template with sample rows</p>
                </div>
                <Download size={15} className="text-slate-400 group-hover:text-slate-600 shrink-0"/>
              </button>
            </div>
          </div>

          {/* Bank Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3" style={{ fontFamily: 'Space Grotesk' }}>Bank Summary</h3>
            {bankSummary ? (
              <div className="space-y-2">
                {CATEGORIES.map(cat => {
                  const qs = bankSummary[cat] || [];
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR[cat] }}/>
                      <span className="text-sm text-slate-600 flex-1 capitalize">{cat}</span>
                      <span className="text-xs font-bold" style={{ color: CAT_COLOR[cat] }}>{qs.length}</span>
                      <span className="text-xs text-slate-400">questions</span>
                    </div>
                  );
                })}
                <div className="border-t border-slate-100 pt-2 mt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Total</span>
                  <span className="text-sm font-bold text-slate-700">
                    {Object.values(bankSummary).flat().length}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-200 shrink-0"/>
                    <div className="h-3 bg-slate-100 rounded flex-1 animate-pulse"/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2 text-sm">
              <AlertTriangle size={14}/> Import Instructions
            </h3>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Download a template first — column names must match exactly</li>
              <li>MCQ / Image: fill option_a – option_d and correct_option (A/B/C/D)</li>
              <li>Match: fill pair1_left + pair1_right through pair4 (pair1 and pair2 required)</li>
              <li>True / False: set correct_option to A (True) or B (False)</li>
              <li>Image: fill image_url with a publicly accessible image URL</li>
              <li>Duplicate question texts are automatically skipped (idempotent)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

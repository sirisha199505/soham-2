import { useState, useRef } from 'react';
import {
  Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X,
  FileText, Eye, ChevronDown, ChevronUp, Table,
} from 'lucide-react';
import { loadQuestionBank, saveQuestionBank, generateQuestionId, CATEGORY_META, CATEGORIES } from '../../utils/questionBank';
import { getStudentAttempts } from '../../utils/quizGenerator';

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
      if (line[i+1] === '"') { cur += '"'; i++; }
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

// ─── Template ─────────────────────────────────────────────────────────────
const QUESTION_HEADERS = [
  'category','type','difficulty','text','option_a','option_b','option_c','option_d',
  'correct_option','pair1_left','pair1_right','pair2_left','pair2_right',
  'pair3_left','pair3_right','pair4_left','pair4_right','image_url','explanation',
];

const SAMPLE_ROWS = [
  { category:'robotics', type:'mcq', difficulty:'easy',
    text:'What does CPU stand for?',
    option_a:'Central Processing Unit', option_b:'Core Power Unit',
    option_c:'Computer Protocol Unit', option_d:'Central Program Utility',
    correct_option:'A',
    pair1_left:'', pair1_right:'', pair2_left:'', pair2_right:'',
    pair3_left:'', pair3_right:'', pair4_left:'', pair4_right:'',
    image_url:'', explanation:'CPU stands for Central Processing Unit.' },
  { category:'chemistry', type:'match', difficulty:'medium',
    text:'Match the element to its symbol:',
    option_a:'', option_b:'', option_c:'', option_d:'', correct_option:'',
    pair1_left:'Gold', pair1_right:'Au', pair2_left:'Iron', pair2_right:'Fe',
    pair3_left:'Sodium', pair3_right:'Na', pair4_left:'Potassium', pair4_right:'K',
    image_url:'', explanation:'Chemical symbols of common elements.' },
];

function rowToQuestion(row) {
  const q = {
    id: generateQuestionId(row.category),
    category: (row.category || '').toLowerCase().trim(),
    type: (row.type || 'mcq').toLowerCase().trim(),
    difficulty: (row.difficulty || 'easy').toLowerCase().trim(),
    text: (row.text || '').trim(),
    status: 'active',
    explanation: (row.explanation || '').trim(),
  };
  if (!CATEGORIES.includes(q.category)) q.category = 'robotics';
  if (!['mcq','match','image','tf'].includes(q.type)) q.type = 'mcq';
  if (!['easy','medium','hard'].includes(q.difficulty)) q.difficulty = 'easy';

  if (q.type === 'match') {
    q.pairs = [
      { left: row.pair1_left||'', right: row.pair1_right||'' },
      { left: row.pair2_left||'', right: row.pair2_right||'' },
      { left: row.pair3_left||'', right: row.pair3_right||'' },
      { left: row.pair4_left||'', right: row.pair4_right||'' },
    ];
  } else {
    q.options = q.type === 'tf'
      ? ['True','False']
      : [row.option_a||'', row.option_b||'', row.option_c||'', row.option_d||''];
    const corrLetter = (row.correct_option || 'A').toUpperCase();
    const corrIdx = { A:0, B:1, C:2, D:3 }[corrLetter] ?? 0;
    q.correct = q.type === 'tf' ? (corrLetter === 'A' ? 0 : 1) : corrIdx;
    if (q.type === 'image') q.imageUrl = row.image_url || '';
  }
  return q;
}

function validateRow(row) {
  const errs = [];
  if (!row.text) errs.push('Missing question text');
  const type = (row.type || '').toLowerCase();
  if (type === 'match') {
    if (!row.pair1_left || !row.pair1_right) errs.push('Pair 1 incomplete');
    if (!row.pair2_left || !row.pair2_right) errs.push('Pair 2 incomplete');
  } else if (type !== 'tf') {
    if (!row.option_a || !row.option_b || !row.option_c || !row.option_d)
      errs.push('Options A/B/C/D required');
    if (!row.correct_option) errs.push('correct_option required');
  }
  return errs;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function ImportExport() {
  const [file,        setFile]        = useState(null);
  const [parsed,      setParsed]      = useState(null);
  const [importing,   setImporting]   = useState(false);
  const [importDone,  setImportDone]  = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast,       setToast]       = useState('');
  const fileRef = useRef();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const processFile = (f) => {
    setFile(f); setParsed(null); setImportDone(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows } = parseCSV(e.target.result);
      setParsed(rows.map(row => ({ row, errors: validateRow(row) })));
    };
    reader.readAsText(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleImport = () => {
    if (!parsed) return;
    setImporting(true);
    setTimeout(() => {
      const valid = parsed.filter(x => x.errors.length === 0).map(x => rowToQuestion(x.row));
      const bank  = loadQuestionBank();
      valid.forEach(q => {
        if (!bank[q.category]) bank[q.category] = [];
        bank[q.category].push(q);
      });
      saveQuestionBank(bank);
      setImportDone({ added: valid.length, skipped: parsed.length - valid.length });
      setImporting(false);
      showToast(`${valid.length} questions imported!`);
    }, 600);
  };

  const handleReset = () => {
    setFile(null); setParsed(null); setImportDone(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const exportTemplate = () => {
    downloadCSV('question_template.csv', toCSV(QUESTION_HEADERS, SAMPLE_ROWS));
    showToast('Template downloaded!');
  };

  const exportAllQuestions = () => {
    const bank = loadQuestionBank();
    const rows = CATEGORIES.flatMap(cat => (bank[cat] || []).map(q => ({
      category: q.category, type: q.type, difficulty: q.difficulty,
      text: q.text, status: q.status,
      option_a: q.options?.[0]||'', option_b: q.options?.[1]||'',
      option_c: q.options?.[2]||'', option_d: q.options?.[3]||'',
      correct_option: ['A','B','C','D'][q.correct]||'',
      pair1_left: q.pairs?.[0]?.left||'', pair1_right: q.pairs?.[0]?.right||'',
      pair2_left: q.pairs?.[1]?.left||'', pair2_right: q.pairs?.[1]?.right||'',
      pair3_left: q.pairs?.[2]?.left||'', pair3_right: q.pairs?.[2]?.right||'',
      pair4_left: q.pairs?.[3]?.left||'', pair4_right: q.pairs?.[3]?.right||'',
      image_url: q.imageUrl||'', explanation: q.explanation||'',
    })));
    downloadCSV('all_questions.csv', toCSV(QUESTION_HEADERS, rows));
    showToast('Questions exported!');
  };

  const exportStudentResults = () => {
    try {
      const students = JSON.parse(localStorage.getItem('rqa_students') || '[]');
      const headers  = ['student_id','name','level','date','score_pct','correct','wrong','total','time_sec'];
      const rows = [];
      students.forEach(s => {
        getStudentAttempts(s.uniqueId).forEach(a => {
          rows.push({
            student_id: s.uniqueId, name: s.name,
            level: a.levelTitle || `Level ${a.levelId}`,
            date: a.date ? new Date(a.date).toLocaleDateString() : '',
            score_pct: a.score?.pct ?? '',
            correct: a.score?.correct ?? '', wrong: a.score?.wrong ?? '',
            total: a.score?.total ?? '', time_sec: a.score?.timeTaken ?? '',
          });
        });
      });
      downloadCSV('student_results.csv', toCSV(headers, rows));
      showToast('Student results exported!');
    } catch { showToast('Export failed.'); }
  };

  const validCount   = parsed ? parsed.filter(x => x.errors.length === 0).length : 0;
  const invalidCount = parsed ? parsed.filter(x => x.errors.length > 0).length : 0;
  const bank = loadQuestionBank();

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14}/> {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Import / Export</h1>
        <p className="text-sm text-slate-400 mt-0.5">Bulk import questions via CSV/Excel and export data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Import ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Upload size={15} className="text-indigo-500"/>
              </div>
              <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Import Questions</h2>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-blue-700 mb-1">Supported: CSV, XLSX</p>
              <p className="text-xs text-blue-600">
                Category: <strong>robotics, chemistry, physics, mathematics</strong><br/>
                Type: <strong>mcq, match, image, tf</strong> · Correct: <strong>A / B / C / D</strong>
              </p>
            </div>

            {!file ? (
              <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50'
                }`}>
                <Upload size={28} className={`mx-auto mb-3 ${dragging ? 'text-indigo-500' : 'text-slate-400'}`}/>
                <p className="font-semibold text-slate-700 text-sm">
                  {dragging ? 'Drop to upload' : 'Click or drag file here'}
                </p>
                <p className="text-xs text-slate-400 mt-1">.csv and .xlsx supported</p>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={e => e.target.files[0] && processFile(e.target.files[0])} className="hidden"/>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <FileText size={20} className="text-indigo-500 shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size/1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={handleReset} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400"><X size={14}/></button>
                </div>

                {parsed && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label:'Total', val: parsed.length, color:'text-slate-700', bg:'bg-slate-50' },
                        { label:'Valid', val: validCount, color:'text-green-700', bg:'bg-green-50' },
                        { label:'Errors', val: invalidCount, color:'text-red-700', bg:'bg-red-50' },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-xl p-2`}>
                          <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                          <p className="text-[10px] text-slate-400">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <button onClick={() => setPreviewOpen(p => !p)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                      <span className="flex items-center gap-1.5"><Eye size={13}/> Preview Rows</span>
                      {previewOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                    </button>

                    {previewOpen && (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-52">
                        <table className="w-full text-[10px]">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>{['#','Cat','Type','Question','Status'].map(h => (
                              <th key={h} className="px-2 py-1.5 text-left font-bold text-slate-500">{h}</th>
                            ))}</tr>
                          </thead>
                          <tbody>
                            {parsed.map(({ row, errors }, i) => (
                              <tr key={i} className={`border-t border-slate-100 ${errors.length ? 'bg-red-50' : ''}`}>
                                <td className="px-2 py-1.5 text-slate-400">{i+1}</td>
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
                      <button onClick={handleImport} disabled={importing || validCount === 0}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all">
                        {importing
                          ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full inline-block"/> Importing…</>
                          : <><Upload size={15}/> Import {validCount} Question{validCount !== 1 ? 's' : ''}</>}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            <button onClick={exportTemplate}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-indigo-300 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors">
              <Download size={14}/> Download CSV Template
            </button>
          </div>
        </div>

        {/* ── Export ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                <Download size={15} className="text-green-500"/>
              </div>
              <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Export Data</h2>
            </div>

            <div className="space-y-3">
              {[
                { icon:<Table size={18} className="text-indigo-500"/>, title:'All Questions',
                  desc:'Full question bank across all 4 categories', action:exportAllQuestions, color:'#4F46E5' },
                { icon:<FileText size={18} className="text-green-500"/>, title:'Student Results',
                  desc:'All quiz attempts with scores and times', action:exportStudentResults, color:'#10B981' },
                { icon:<FileSpreadsheet size={18} className="text-amber-500"/>, title:'CSV Template',
                  desc:'Blank template with sample rows', action:exportTemplate, color:'#F59E0B' },
              ].map((item, i) => (
                <button key={i} onClick={item.action}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all text-left group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.color + '15' }}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700">{item.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <Download size={15} className="text-slate-400 group-hover:text-slate-600 shrink-0"/>
                </button>
              ))}
            </div>
          </div>

          {/* Bank summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3" style={{ fontFamily:'Space Grotesk' }}>Bank Summary</h3>
            <div className="space-y-2">
              {CATEGORIES.map(cat => {
                const total  = (bank[cat] || []).length;
                const active = (bank[cat] || []).filter(q => q.status === 'active').length;
                const meta   = CATEGORY_META[cat];
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: meta.color }}/>
                    <span className="text-sm text-slate-600 flex-1">{meta.label}</span>
                    <span className="text-xs font-bold" style={{ color: meta.color }}>{active}</span>
                    <span className="text-xs text-slate-400">/ {total}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
            <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2 text-sm">
              <AlertTriangle size={14}/> Import Instructions
            </h3>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Download template first for correct column format</li>
              <li>MCQ: fill option_a – option_d and correct_option (A/B/C/D)</li>
              <li>Match: fill pair1_left, pair1_right through pair4</li>
              <li>Image: fill image_url with a public image URL</li>
              <li>Rows with errors are automatically skipped</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

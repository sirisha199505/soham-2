import { useState } from 'react';
import {
  Plus, Search, Edit2, Trash2, Upload, Tag,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  FileText, Download, Check, AlertCircle,
} from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input, { Select, Textarea } from '../../components/ui/Input';
import { mockQuestions } from '../../utils/mockData';
import { TOPIC_TAGS } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES = [
  { value: 'mcq',          label: 'MCQ',          sub: '4 options · 1 correct',    color: 'bg-blue-100 text-blue-700' },
  { value: 'true_false',   label: 'True / False', sub: '2 options · 1 correct',    color: 'bg-purple-100 text-purple-700' },
  { value: 'multi_select', label: 'Multi-Select', sub: '4 options · many correct', color: 'bg-indigo-100 text-indigo-700' },
];

const STATUS_STYLE = {
  approved: 'bg-green-100 text-green-700 border border-green-200',
  pending:  'bg-yellow-100 text-yellow-700 border border-yellow-200',
  rejected: 'bg-red-100 text-red-600 border border-red-200',
};

const DIFF_COLOR = {
  easy:   'bg-green-50 text-green-700',
  medium: 'bg-amber-50 text-amber-700',
  hard:   'bg-red-50 text-red-700',
};

const EMPTY_FORM = {
  text: '', type: 'mcq', topic: TOPIC_TAGS[0], difficulty: 'easy', marks: 2,
  options: ['', '', '', ''], correct: 0, explanation: '', status: 'pending',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function QuestionBank() {
  const toast = useToast();
  const { colors } = useTheme();

  const [questions, setQuestions] = useState(() =>
    mockQuestions.map(q => ({
      ...q,
      topic: q.topic ?? q.label,
      status: 'approved',
      explanation: '',
    }))
  );

  const [search,       setSearch]       = useState('');
  const [topicFilter,  setTopicFilter]  = useState('all');
  const [diffFilter,   setDiffFilter]   = useState('all');
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId,   setExpandedId]   = useState(null);

  const [showAdd,       setShowAdd]       = useState(false);
  const [editId,        setEditId]        = useState(null);
  const [showDelete,    setShowDelete]    = useState(null);
  const [showBulkUpload,setShowBulkUpload]= useState(false);
  const [form,          setForm]          = useState(EMPTY_FORM);

  // ── Filtering ──
  const filtered = questions.filter(q => {
    const qTopic = q.topic ?? q.label ?? '';
    if (search       && !q.text.toLowerCase().includes(search.toLowerCase())) return false;
    if (topicFilter  !== 'all' && qTopic !== topicFilter)   return false;
    if (diffFilter   !== 'all' && q.difficulty !== diffFilter) return false;
    if (typeFilter   !== 'all' && (q.type || 'mcq') !== typeFilter) return false;
    if (statusFilter !== 'all' && (q.status || 'approved') !== statusFilter) return false;
    return true;
  });

  // ── Form helpers ──
  const handleTypeChange = (type) => {
    if (type === 'true_false') {
      setForm(p => ({ ...p, type, options: ['True', 'False'], correct: 0 }));
    } else if (type === 'multi_select') {
      setForm(p => ({ ...p, type, options: ['', '', '', ''], correct: [] }));
    } else {
      setForm(p => ({ ...p, type, options: ['', '', '', ''], correct: 0 }));
    }
  };

  const handleCorrectToggle = (i) => {
    if (form.type === 'multi_select') {
      setForm(p => {
        const arr = Array.isArray(p.correct) ? [...p.correct] : [];
        return { ...p, correct: arr.includes(i) ? arr.filter(x => x !== i) : [...arr, i] };
      });
    } else {
      setForm(p => ({ ...p, correct: i }));
    }
  };

  const isFormCorrect = (i) => {
    if (form.type === 'multi_select') return Array.isArray(form.correct) && form.correct.includes(i);
    return form.correct === i;
  };

  const isDisplayCorrect = (q, i) => {
    if (Array.isArray(q.correct)) return q.correct.includes(i);
    return q.correct === i;
  };

  // ── Validation ──
  const validate = () => {
    if (!form.text.trim())                       { toast.error('Question text is required'); return false; }
    if (form.type !== 'true_false' && form.options.some(o => !o.trim())) {
      toast.error('All answer options must be filled'); return false;
    }
    if (form.type === 'multi_select' && (!Array.isArray(form.correct) || form.correct.length === 0)) {
      toast.error('Select at least one correct answer'); return false;
    }
    return true;
  };

  // ── CRUD ──
  const handleAdd = () => {
    if (!validate()) return;
    setQuestions(p => [{ ...form, id: 'q' + Date.now(), topic: form.topic }, ...p]);
    toast.success('Question added to bank!');
    setShowAdd(false);
    setForm(EMPTY_FORM);
  };

  const openEdit = (q) => {
    setForm({
      text:        q.text,
      type:        q.type || 'mcq',
      topic:       q.topic ?? q.label ?? TOPIC_TAGS[0],
      difficulty:  q.difficulty,
      marks:       q.marks,
      options:     q.type === 'true_false' ? ['True', 'False'] : [...(q.options || ['', '', '', ''])],
      correct:     q.correct ?? 0,
      explanation: q.explanation || '',
      status:      q.status || 'approved',
    });
    setEditId(q.id);
  };

  const handleEdit = () => {
    if (!validate()) return;
    setQuestions(p => p.map(q => q.id === editId ? { ...q, ...form } : q));
    toast.success('Question updated!');
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = () => {
    setQuestions(p => p.filter(q => q.id !== showDelete));
    toast.success('Question deleted');
    setShowDelete(null);
  };

  const setStatus = (id, status) => {
    setQuestions(p => p.map(q => q.id === id ? { ...q, status } : q));
    toast.success(`Question ${status}`);
  };

  // ── Stats ──
  const stats = {
    total:    questions.length,
    approved: questions.filter(q => (q.status || 'approved') === 'approved').length,
    pending:  questions.filter(q => q.status === 'pending').length,
    mcq:      questions.filter(q => (q.type || 'mcq') === 'mcq').length,
    tf:       questions.filter(q => q.type === 'true_false').length,
    ms:       questions.filter(q => q.type === 'multi_select').length,
  };

  // ── Question Form (shared by add + edit) ──
  const QuestionForm = () => (
    <div className="space-y-5">

      {/* Type selector */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">Question Type</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => handleTypeChange(t.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                form.type === t.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
              }`}>
              <p className={`text-sm font-semibold ${form.type === t.value ? 'text-indigo-700' : 'text-slate-700'}`}>{t.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{t.sub}</p>
            </button>
          ))}
        </div>
      </div>

      <Textarea label="Question Text" required placeholder="Enter the question statement…" rows={3}
        value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select label="Topic" required value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}>
          {TOPIC_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Difficulty" required value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
        <Input label="Marks" required type="number" value={form.marks} min={1} max={10}
          onChange={e => setForm(p => ({ ...p, marks: +e.target.value }))} />
      </div>

      {/* Answer options */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-1.5">
          Answer Options <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-slate-400 ml-2">
            {form.type === 'multi_select' ? 'Check all correct answers' : 'Select the correct answer'}
          </span>
        </label>
        <div className="space-y-2">
          {form.options.map((opt, i) => {
            const correct = isFormCorrect(i);
            return (
              <div key={i} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all ${
                correct ? 'border-green-300 bg-green-50' : 'border-slate-100 bg-slate-50/50'
              }`}>
                <button type="button" onClick={() => handleCorrectToggle(i)}
                  className={`w-5 h-5 flex items-center justify-center shrink-0 transition-all border-2 ${
                    form.type === 'multi_select' ? 'rounded' : 'rounded-full'
                  } ${correct ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-green-400'}`}>
                  {correct && <Check size={11} className="text-white" />}
                </button>
                {form.type === 'true_false' ? (
                  <span className="text-sm font-medium text-slate-700">{opt}</span>
                ) : (
                  <>
                    <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${correct ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input value={opt} placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      onChange={e => setForm(p => ({ ...p, options: p.options.map((o, j) => j === i ? e.target.value : o) }))}
                      className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-300" />
                  </>
                )}
                {correct && <span className="text-[10px] font-bold text-green-600 shrink-0">✓ Correct</span>}
              </div>
            );
          })}
        </div>
      </div>

      <Textarea label="Explanation (Optional)" placeholder="Explain why this answer is correct…" rows={2}
        value={form.explanation} onChange={e => setForm(p => ({ ...p, explanation: e.target.value }))} />

      <Select label="Approval Status" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
        <option value="pending">Pending Approval</option>
        <option value="approved">Approved</option>
      </Select>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Question Bank</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {questions.length} questions · <span className="text-green-600 font-medium">{stats.approved} approved</span> · <span className="text-yellow-600 font-medium">{stats.pending} pending</span>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" icon={<Upload size={15} />} onClick={() => setShowBulkUpload(true)}>
            Bulk Upload
          </Button>
          <Button size="sm" icon={<Plus size={15} />} onClick={() => { setForm(EMPTY_FORM); setShowAdd(true); }}>
            Add Question
          </Button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total',        value: stats.total,    cls: 'bg-slate-50    border-slate-100',  txt: 'text-slate-700'  },
          { label: 'Approved',     value: stats.approved, cls: 'bg-green-50    border-green-100',  txt: 'text-green-700'  },
          { label: 'Pending',      value: stats.pending,  cls: 'bg-yellow-50   border-yellow-100', txt: 'text-yellow-700' },
          { label: 'MCQ',          value: stats.mcq,      cls: 'bg-blue-50     border-blue-100',   txt: 'text-blue-700'   },
          { label: 'True / False', value: stats.tf,       cls: 'bg-purple-50   border-purple-100', txt: 'text-purple-700' },
          { label: 'Multi-Select', value: stats.ms,       cls: 'bg-indigo-50   border-indigo-100', txt: 'text-indigo-700' },
        ].map(s => (
          <div key={s.label} className={`${s.cls} border rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${s.txt}`} style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card padding={false}>
        <div className="p-4 flex flex-col sm:flex-row gap-2.5 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          {[
            { v: topicFilter,  fn: setTopicFilter,  opts: [['all','All Topics'],    ...TOPIC_TAGS.map(t => [t, t])] },
            { v: diffFilter,   fn: setDiffFilter,   opts: [['all','All Difficulty'],['easy','Easy'],['medium','Medium'],['hard','Hard']] },
            { v: typeFilter,   fn: setTypeFilter,   opts: [['all','All Types'],     ['mcq','MCQ'],['true_false','True/False'],['multi_select','Multi-Select']] },
            { v: statusFilter, fn: setStatusFilter, opts: [['all','All Status'],    ['approved','Approved'],['pending','Pending'],['rejected','Rejected']] },
          ].map((f, i) => (
            <select key={i} value={f.v} onChange={e => f.fn(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
              {f.opts.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
            </select>
          ))}
        </div>
      </Card>

      {/* ── Question list ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <FileText size={40} className="mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-500">No questions found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters or add a new question</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q, idx) => {
            const qType    = q.type || 'mcq';
            const qTopic   = q.topic ?? q.label ?? '—';
            const qStatus  = q.status || 'approved';
            const expanded = expandedId === q.id;
            const typeMeta = TYPES.find(t => t.value === qType) ?? TYPES[0];

            return (
              <div key={q.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:border-indigo-100 hover:shadow-md transition-all">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Index badge */}
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-2.5">{q.text}</p>

                      {/* Options grid */}
                      <div className={`grid gap-1.5 mb-3 ${qType === 'true_false' ? 'grid-cols-2' : 'grid-cols-2'}`}>
                        {q.options.map((opt, j) => {
                          const correct = isDisplayCorrect(q, j);
                          return (
                            <div key={j} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${
                              correct ? 'bg-green-50 text-green-700 font-semibold border border-green-100' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {correct && <Check size={10} className="text-green-500 shrink-0" />}
                              {qType !== 'true_false' && (
                                <span className={`font-bold mr-0.5 ${correct ? 'text-green-600' : 'text-slate-400'}`}>{String.fromCharCode(65 + j)}.</span>
                              )}
                              {opt}
                            </div>
                          );
                        })}
                      </div>

                      {/* Meta badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeMeta.color}`}>{typeMeta.label}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 flex items-center gap-1">
                          <Tag size={9} />{qTopic}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{q.marks}m</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[qStatus]}`}>{qStatus}</span>
                      </div>

                      {/* Explanation toggle */}
                      {q.explanation && (
                        <button onClick={() => setExpandedId(expanded ? null : q.id)}
                          className="mt-2 flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {expanded ? 'Hide explanation' : 'Show explanation'}
                        </button>
                      )}
                    </div>

                    {/* Action buttons column */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => openEdit(q)}
                        title="Edit"
                        className="w-8 h-8 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setShowDelete(q.id)}
                        title="Delete"
                        className="w-8 h-8 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                        <Trash2 size={14} />
                      </button>
                      {qStatus !== 'approved' && (
                        <button onClick={() => setStatus(q.id, 'approved')}
                          title="Approve"
                          className="w-8 h-8 rounded-xl hover:bg-green-50 text-slate-400 hover:text-green-600 flex items-center justify-center transition-colors">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {qStatus === 'approved' && (
                        <button onClick={() => setStatus(q.id, 'rejected')}
                          title="Reject"
                          className="w-8 h-8 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded explanation */}
                  {expanded && q.explanation && (
                    <div className="mt-3 ml-10 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-xs font-bold text-indigo-700 mb-1">Explanation</p>
                      <p className="text-xs text-indigo-800 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add modal ── */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setForm(EMPTY_FORM); }}
        title="Add New Question" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button onClick={handleAdd} icon={<Plus size={15} />}>Add Question</Button>
          </>
        }>
        <QuestionForm />
      </Modal>

      {/* ── Edit modal ── */}
      <Modal isOpen={!!editId} onClose={() => { setEditId(null); setForm(EMPTY_FORM); }}
        title="Edit Question" size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditId(null); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </>
        }>
        <QuestionForm />
      </Modal>

      {/* ── Delete confirm ── */}
      <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)}
        title="Delete Question?" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <p className="text-slate-600 text-sm leading-relaxed pt-1">
            This question will be permanently removed from the question bank and cannot be recovered.
          </p>
        </div>
      </Modal>

      {/* ── Bulk Upload modal ── */}
      <Modal isOpen={showBulkUpload} onClose={() => setShowBulkUpload(false)}
        title="Bulk Upload Questions" size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBulkUpload(false)}>Cancel</Button>
            <Button icon={<Upload size={15} />} onClick={() => { toast.info('Bulk upload coming soon!'); setShowBulkUpload(false); }}>
              Upload File
            </Button>
          </>
        }>
        <div className="space-y-4">
          {/* CSV format reference */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-1">Required CSV/Excel Format</p>
            <p className="text-xs text-slate-500 mb-3">Your file must include these columns in order:</p>
            <div className="flex flex-wrap gap-1.5">
              {['question_text', 'type', 'option_a', 'option_b', 'option_c', 'option_d', 'correct', 'topic', 'difficulty', 'marks', 'explanation'].map(h => (
                <span key={h} className="text-[11px] font-mono bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">{h}</span>
              ))}
            </div>
            <div className="mt-3 p-2 bg-white rounded-lg border border-slate-200">
              <p className="text-[10px] font-semibold text-slate-500 mb-1">Type values:</p>
              <p className="text-[10px] text-slate-400 font-mono">mcq · true_false · multi_select</p>
              <p className="text-[10px] font-semibold text-slate-500 mb-1 mt-1.5">Correct column:</p>
              <p className="text-[10px] text-slate-400 font-mono">MCQ/TF: A, B, C, or D · Multi-select: A,C</p>
            </div>
          </div>

          <button className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            <Download size={14} /> Download CSV Template
          </button>

          <label className="block">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group">
              <Upload size={30} className="mx-auto mb-2 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              <p className="text-sm font-semibold text-slate-600 group-hover:text-indigo-700">Drop your CSV or Excel file here</p>
              <p className="text-xs text-slate-400 mt-1">Supports .csv and .xlsx · Max 500 questions</p>
            </div>
            <input type="file" accept=".csv,.xlsx" className="hidden" />
          </label>
        </div>
      </Modal>
    </div>
  );
}

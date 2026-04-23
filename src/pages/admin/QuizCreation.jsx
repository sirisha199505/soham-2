import { useState } from 'react';
import { Plus, Eye, Save, Check, Shuffle, Zap, RotateCcw, BookOpen, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input, { Select, Textarea } from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { mockQuestions } from '../../utils/mockData';
import { TOPIC_TAGS } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

const DIFF_COLOR = { easy: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', hard: 'bg-red-100 text-red-700' };

export default function QuizCreation() {
  const navigate = useNavigate();
  const toast = useToast();
  const { colors } = useTheme();

  const [mode, setMode] = useState('manual'); // 'manual' | 'auto'
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', description: '', topic: TOPIC_TAGS[0],
    duration: 30, totalMarks: 0, difficulty: 'medium',
    passingScore: 60,
    randomize: false, negativeMarking: true, negativeValue: 0.5,
    attemptsAllowed: 1, selectedQuestions: [],
  });

  // Auto-generate config
  const [genConfig, setGenConfig] = useState({
    topic: 'all', easyCount: 3, mediumCount: 4, hardCount: 3,
  });
  const [genPreview, setGenPreview] = useState([]);

  // ── Manual: toggle question selection ──
  const toggleQuestion = (q) => {
    setForm(p => {
      const exists = p.selectedQuestions.find(sq => sq.id === q.id);
      return {
        ...p,
        selectedQuestions: exists
          ? p.selectedQuestions.filter(sq => sq.id !== q.id)
          : [...p.selectedQuestions, q],
        totalMarks: exists ? p.totalMarks - q.marks : p.totalMarks + q.marks,
      };
    });
  };

  // ── Auto-generate ──
  const handleAutoGenerate = () => {
    const pool = mockQuestions.filter(q =>
      genConfig.topic === 'all' || (q.topic ?? q.label) === genConfig.topic
    );

    const pick = (diff, n) => {
      const candidates = pool.filter(q => q.difficulty === diff);
      return [...candidates].sort(() => Math.random() - 0.5).slice(0, Math.min(n, candidates.length));
    };

    const generated = [
      ...pick('easy',   genConfig.easyCount),
      ...pick('medium', genConfig.mediumCount),
      ...pick('hard',   genConfig.hardCount),
    ];

    if (generated.length === 0) { toast.error('No matching questions found for the selected criteria'); return; }

    const totalMarks = generated.reduce((s, q) => s + q.marks, 0);
    setGenPreview(generated);
    setForm(p => ({ ...p, selectedQuestions: generated, totalMarks }));
    toast.success(`Auto-generated ${generated.length} questions (${totalMarks} marks)`);
    setStep(2);
  };

  const removeGenQuestion = (id) => {
    const updated = genPreview.filter(q => q.id !== id);
    const totalMarks = updated.reduce((s, q) => s + q.marks, 0);
    setGenPreview(updated);
    setForm(p => ({ ...p, selectedQuestions: updated, totalMarks }));
  };

  // ── Submit ──
  const handleSubmit = () => {
    if (!form.title) { toast.error('Quiz title is required'); return; }
    if (form.selectedQuestions.length === 0) { toast.error('Please select at least one question'); return; }
    toast.success('Quiz published successfully!', 'Quiz Published');
    navigate('/quizzes');
  };

  const handleSaveDraft = () => {
    toast.info('Quiz saved as draft');
    navigate('/quizzes');
  };

  const STEPS = [
    { n: 1, label: mode === 'auto' ? 'Info & Config' : 'Basic Info' },
    { n: 2, label: mode === 'auto' ? 'Preview'       : 'Questions'  },
    { n: 3, label: 'Settings' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Create New Quiz</h1>
          <p className="text-slate-500 text-sm mt-0.5">Design a comprehensive assessment for your students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Save size={14} />} onClick={handleSaveDraft}>Save Draft</Button>
          <Button size="sm" icon={<Eye size={14} />} variant="outline">Preview</Button>
        </div>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {[
          { key: 'manual', label: 'Manual Creation', icon: <BookOpen size={15} /> },
          { key: 'auto',   label: 'Auto-Generate',   icon: <Zap size={15} /> },
        ].map(m => (
          <button key={m.key}
            onClick={() => { setMode(m.key); setStep(1); setForm(p => ({ ...p, selectedQuestions: [], totalMarks: 0 })); setGenPreview([]); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === m.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <button onClick={() => setStep(s.n)} className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.n ? 'text-white' : step === s.n ? 'text-white' : 'bg-slate-100 text-slate-400'
              }`} style={step >= s.n ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : {}}>
                {step > s.n ? <Check size={15} /> : s.n}
              </div>
              <span className={`text-sm font-medium hidden sm:block transition-colors ${step >= s.n ? 'text-indigo-600' : 'text-slate-400'}`}>{s.label}</span>
            </button>
            {i < 2 && <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${step > s.n ? 'bg-indigo-500' : 'bg-slate-100'}`} />}
          </div>
        ))}
      </div>

      {/* ════════════════ STEP 1 ════════════════ */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Basic info */}
          <Card>
            <CardHeader title="Basic Information" subtitle="Quiz title, topic and duration" />
            <div className="space-y-4">
              <Input label="Quiz Title" required placeholder="e.g., Robotics Fundamentals Quiz"
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <Textarea label="Description" placeholder="Describe quiz objectives…"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select label="Topic" required value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}>
                  {TOPIC_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Select label="Difficulty" value={form.difficulty} onChange={e => setForm(p => ({ ...p, difficulty: e.target.value }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
                <Input label="Duration (minutes)" required type="number" value={form.duration} min={5} max={180}
                  onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))} />
              </div>
            </div>
          </Card>

          {/* Auto-generate config (only in auto mode) */}
          {mode === 'auto' && (
            <Card>
              <CardHeader title="Auto-Generate Configuration" subtitle="Set question count per difficulty" icon={<Zap size={17} />} />
              <div className="space-y-4">
                <Select label="Topic Filter" value={genConfig.topic} onChange={e => setGenConfig(p => ({ ...p, topic: e.target.value }))}>
                  <option value="all">All Topics</option>
                  {TOPIC_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { key: 'easyCount',   label: 'Easy Questions',   color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
                    { key: 'mediumCount', label: 'Medium Questions',  color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                    { key: 'hardCount',   label: 'Hard Questions',    color: 'text-red-600',   bg: 'bg-red-50   border-red-200'   },
                  ].map(d => (
                    <div key={d.key} className={`${d.bg} border rounded-xl p-3`}>
                      <p className={`text-xs font-semibold ${d.color} mb-2`}>{d.label}</p>
                      <input type="number" min={0} max={20} value={genConfig[d.key]}
                        onChange={e => setGenConfig(p => ({ ...p, [d.key]: +e.target.value }))}
                        className={`w-full text-center text-xl font-bold ${d.color} bg-transparent border-none outline-none`} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl text-sm">
                  <span className="text-slate-500">Total questions requested</span>
                  <span className="font-bold text-slate-800">{genConfig.easyCount + genConfig.mediumCount + genConfig.hardCount}</span>
                </div>
                <Button onClick={handleAutoGenerate} icon={<Zap size={15} />} fullWidth>
                  Generate Questions from Bank
                </Button>
              </div>
            </Card>
          )}

          {mode === 'manual' && (
            <div className="flex justify-end">
              <Button onClick={() => { if (!form.title) { toast.error('Please enter a quiz title'); return; } setStep(2); }}>
                Continue to Questions
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ STEP 2 — MANUAL: Select Questions ════════════════ */}
      {step === 2 && mode === 'manual' && (
        <div className="space-y-4">
          {/* Selection summary */}
          <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {form.selectedQuestions.length}
            </div>
            <div>
              <p className="font-semibold text-indigo-900">Questions Selected</p>
              <p className="text-xs text-indigo-600 mt-0.5">{form.totalMarks} total marks</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {mockQuestions.map(q => {
              const selected = !!form.selectedQuestions.find(sq => sq.id === q.id);
              const qTopic = q.topic ?? q.label;
              return (
                <div key={q.id}
                  onClick={() => toggleQuestion(q)}
                  className={`bg-white rounded-2xl border-2 p-4 cursor-pointer transition-all hover:shadow-sm ${
                    selected ? 'border-indigo-500 bg-indigo-50/40 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {selected && <Check size={13} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 mb-2">{q.text}</p>
                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{qTopic}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{q.marks}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={form.selectedQuestions.length === 0} className="flex-1">
              Continue to Settings ({form.selectedQuestions.length} selected)
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════ STEP 2 — AUTO: Preview Generated Questions ════════════════ */}
      {step === 2 && mode === 'auto' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 border border-green-100 rounded-xl">
              <Zap size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-green-800">{genPreview.length} questions auto-generated · {form.totalMarks} marks</span>
            </div>
            <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={() => setStep(1)}>
              Reconfigure
            </Button>
          </div>

          <div className="space-y-2.5">
            {genPreview.map((q, idx) => {
              const qTopic = q.topic ?? q.label;
              return (
                <div key={q.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-start gap-3 shadow-sm">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 mb-2">{q.text}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">{qTopic}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${DIFF_COLOR[q.difficulty]}`}>{q.difficulty}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{q.marks}m</span>
                    </div>
                  </div>
                  <button onClick={() => removeGenQuestion(q.id)}
                    className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors shrink-0 text-lg font-light mt-0.5"
                    title="Remove">×</button>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={genPreview.length === 0} className="flex-1">
              Continue to Settings
            </Button>
          </div>
        </div>
      )}

      {/* ════════════════ STEP 3 — Settings ════════════════ */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Quiz Settings" subtitle="Configure grading and behaviour" />
            <div className="space-y-4">

              {/* Passing criteria */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Target size={15} className="text-indigo-500" /> Passing Criteria</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Passing Score (%)" type="number" value={form.passingScore} min={0} max={100}
                    onChange={e => setForm(p => ({ ...p, passingScore: +e.target.value }))}
                    hint="Minimum percentage required to pass" />
                  <Input label="Attempts Allowed" type="number" value={form.attemptsAllowed} min={1} max={5}
                    onChange={e => setForm(p => ({ ...p, attemptsAllowed: +e.target.value }))}
                    hint="Maximum number of attempts per student" />
                </div>
              </div>

              {/* Toggles */}
              {[
                { key: 'randomize',      label: 'Randomize Questions', desc: 'Shuffle question order for each attempt' },
                { key: 'negativeMarking', label: 'Negative Marking',    desc: 'Deduct marks for wrong answers' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <button onClick={() => setForm(p => ({ ...p, [item.key]: !p[item.key] }))}
                    className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${form[item.key] ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form[item.key] ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              ))}

              {form.negativeMarking && (
                <Input label="Marks deducted per wrong answer" type="number" value={form.negativeValue}
                  step={0.25} min={0.25} max={2}
                  onChange={e => setForm(p => ({ ...p, negativeValue: +e.target.value }))} />
              )}
            </div>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader title="Quiz Summary" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Title',          value: form.title || '—' },
                { label: 'Questions',      value: form.selectedQuestions.length },
                { label: 'Total Marks',    value: form.totalMarks },
                { label: 'Duration',       value: `${form.duration} min` },
                { label: 'Passing Score',  value: `${form.passingScore}%` },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className="font-bold text-slate-800 text-sm truncate">{s.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleSubmit} icon={<Plus size={15} />} className="flex-1">Publish Quiz</Button>
          </div>
        </div>
      )}
    </div>
  );
}

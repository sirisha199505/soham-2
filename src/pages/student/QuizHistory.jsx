import { useState, useMemo, useEffect } from 'react';
import {
  Clock, CheckCircle, XCircle, Minus, Trophy, ChevronDown, ChevronUp,
  Calendar, Target, BookOpen, ArrowRight, Filter, RefreshCw, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { CATEGORY_META } from '../../utils/questionBank';
import {
  formatDuration, matchSelectedIndex, isMatchAllCorrect,
  isOrderAllCorrect, isCategorizeAllCorrect, isHotspotAllCorrect,
} from '../../utils/helpers';
import DragDropReview from '../../components/quiz/DragDropReview';

// ─── Score badge ──────────────────────────────────────────────────────────────
// Shows just the percentage. Per request, there is NO performance-band colour
// coding (no red for low scores) — every percentage uses the same neutral style.
function ScoreBadge({ pct }) {
  return (
    <span className="font-bold text-sm px-2.5 py-1 rounded-full" style={{ color: '#4F46E5', background: '#eef2ff' }}>
      {pct}%
    </span>
  );
}

// ─── Level badge ────────────────────────────────────────────────────────────────
// Derive the square badge from the level NAME (not the DB id). "Level-1" → "L1".
// Falls back to the first letters of the name, and only to the id if there is no
// usable title at all.
function levelBadge(title, id) {
  const t = String(title || '').trim();
  const m = t.match(/\d+/);
  if (m) return `L${m[0]}`;
  if (t) return t.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || `L${id}`;
  return `L${id}`;
}

// ─── Option text helper ───────────────────────────────────────────────────────
const optText  = (o) => (typeof o === 'string' ? o : (o?.text || ''));
const optImage = (o) => (typeof o === 'string' ? '' : (o?.imageUrl || ''));

// ─── Single question review ───────────────────────────────────────────────────
function QuestionReview({ q, answer, index }) {
  const catMeta    = CATEGORY_META[q.category] || { label: q.category, color: '#64748b', bg: '#f8fafc' };
  const correctIdx = q.correct ?? q.correctAnswer;
  const isSkipped  = answer === undefined || answer === null;
  let isCorrect = false;
  if (!isSkipped) {
    if (q.type === 'match')           isCorrect = isMatchAllCorrect(q.pairs, answer);
    else if (q.type === 'order')      isCorrect = isOrderAllCorrect(q.options, answer);
    else if (q.type === 'categorize') isCorrect = isCategorizeAllCorrect(q.extras, answer);
    else if (q.type === 'hotspot')    isCorrect = isHotspotAllCorrect(q.extras, answer);
    else                              isCorrect = answer === correctIdx;
  }
  const statusColor = isSkipped ? '#94a3b8' : isCorrect ? '#16a34a' : '#dc2626';
  const statusBg    = isSkipped ? '#f8fafc'  : isCorrect ? '#f0fdf4' : '#fef2f2';

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: statusColor + '30' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: statusBg, borderColor: statusColor + '20' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: statusColor, color: '#fff' }}>
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: catMeta.bg, color: catMeta.color }}>
              {catMeta.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 line-clamp-2">{q.text}</p>
        </div>
        <div className="shrink-0">
          {isSkipped
            ? <span className="flex items-center gap-1 text-xs font-bold text-slate-400"><Minus size={12}/> Skipped</span>
            : isCorrect
              ? <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle size={13}/> Correct</span>
              : <span className="flex items-center gap-1 text-xs font-bold text-red-600"><XCircle size={13}/> Wrong</span>}
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {q.imageUrl && (
          <img src={q.imageUrl} alt="question" className="w-full max-h-40 object-contain bg-slate-50 rounded-xl border border-slate-100 mb-2"/>
        )}

        {(q.type === 'mcq' || q.type === 'image' || q.type === 'label' || q.type === 'tf') && Array.isArray(q.options) && (
          <div className="grid gap-1.5">
            {q.options.map((opt, i) => {
              const isSelected        = answer === i;
              const isActuallyCorrect = i === correctIdx;
              const oImg              = optImage(opt);
              const oTxt              = optText(opt);
              let cls = 'border-slate-200 bg-slate-50 text-slate-500';
              if (isActuallyCorrect)             cls = 'border-green-300 bg-green-50 text-green-700 font-semibold';
              if (isSelected && !isActuallyCorrect) cls = 'border-red-300 bg-red-50 text-red-700 font-semibold';
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActuallyCorrect ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>{String.fromCharCode(65 + i)}</span>
                  {oImg && <img src={oImg} alt="" className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0"/>}
                  {oTxt && <span className="flex-1">{oTxt}</span>}
                  {isSelected && !isActuallyCorrect && <span className="text-[10px] text-red-400 italic">(your answer)</span>}
                  {isActuallyCorrect && <CheckCircle size={12} className="text-green-500 shrink-0"/>}
                  {isSelected && !isActuallyCorrect && <XCircle size={12} className="text-red-500 shrink-0"/>}
                </div>
              );
            })}
          </div>
        )}

        {q.type === 'match' && q.pairs && (
          <div className="space-y-1.5">
            {q.pairs.map((pair, i) => {
              const selIdx        = matchSelectedIndex(answer, i);
              const isCorrectPair = selIdx === i;
              const selPair       = selIdx !== undefined ? q.pairs[selIdx] : null;
              const selRight      = selPair ? (selPair.right || (selPair.rightImage ? '🖼' : '?')) : null;
              return (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
                  selIdx === undefined ? 'border-slate-200 bg-slate-50' :
                  isCorrectPair ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <span className="flex-1 flex items-center gap-1.5 font-medium text-slate-700">
                    {pair.leftImage && <img src={pair.leftImage} alt="" className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0"/>}
                    {pair.left}
                  </span>
                  <span className="text-slate-400 shrink-0">→</span>
                  <span className={`flex-1 flex items-center gap-1.5 font-semibold ${
                    selIdx === undefined ? 'text-slate-400' : isCorrectPair ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selPair?.rightImage && <img src={selPair.rightImage} alt="" className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0"/>}
                    {selRight || <span className="text-slate-400 italic">Not answered</span>}
                    {!isCorrectPair && selIdx !== undefined && (
                      <span className="text-green-700 ml-1 font-normal">(correct: {pair.right || '🖼'})</span>
                    )}
                  </span>
                  {selIdx !== undefined && (isCorrectPair
                    ? <CheckCircle size={11} className="text-green-500 shrink-0"/>
                    : <XCircle size={11} className="text-red-500 shrink-0"/>)}
                </div>
              );
            })}
          </div>
        )}

        {(q.type === 'order' || q.type === 'categorize' || q.type === 'hotspot') && (
          <DragDropReview q={q} answer={answer}/>
        )}

        {q.explanation && (
          <div className="mt-2 bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 border border-blue-100">
            <span className="font-bold">Explanation: </span>{q.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attempt card ─────────────────────────────────────────────────────────────
const LEVEL_PALETTE = ['#3BC0EF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366f1', '#14b8a6'];
function lvlColor(id) { return LEVEL_PALETTE[(Number(id) - 1) % LEVEL_PALETTE.length] || '#4F46E5'; }

function AttemptCard({ attempt }) {
  const [open, setOpen] = useState(false);
  const badge     = levelBadge(attempt.levelTitle, attempt.levelId);
  const colNum    = parseInt(String(badge).replace(/\D/g, ''), 10) || Number(attempt.levelId) || 1;
  const col       = lvlColor(colNum);
  const date      = attempt.date ? new Date(attempt.date) : null;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
      open ? 'border-indigo-200' : 'border-slate-100'
    }`}>
      <button onClick={() => setOpen(p => !p)} className="w-full text-left">
        <div className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${col}, ${col}cc)` }}>
            {badge}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-bold text-slate-800">{attempt.levelTitle || `Level ${attempt.levelId}`}</span>
              {attempt.attemptNum && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Attempt #{attempt.attemptNum}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {date && (
                <span className="flex items-center gap-1">
                  <Calendar size={10}/> {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <span className="flex items-center gap-1"><Clock size={10}/> {formatDuration(attempt.score?.timeTaken || 0)}</span>
              <span className="flex items-center gap-1"><Target size={10}/> {attempt.score?.correct ?? 0}/{attempt.score?.total ?? 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreBadge pct={attempt.score?.pct ?? 0}/>
            {open ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {/* Score grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Correct', val: attempt.score?.correct ?? 0,  color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Wrong',   val: attempt.score?.wrong   ?? 0,  color: '#dc2626', bg: '#fef2f2' },
              { label: 'Skipped', val: (attempt.score?.total ?? 0) - (attempt.score?.correct ?? 0) - (attempt.score?.wrong ?? 0),
                color: '#64748b', bg: '#f8fafc' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: s.bg }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.val}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Per-question review */}
          <div>
            <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
              <BookOpen size={15}/> Detailed Question Review
              <span className="text-xs font-normal text-slate-400">({(attempt.questions || []).length} questions)</span>
            </h4>
            {(attempt.questions || []).length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-5 text-center border border-dashed border-slate-200">
                <BookOpen size={24} className="text-slate-300 mx-auto mb-2"/>
                <p className="text-sm font-semibold text-slate-400">Question details not available</p>
                <p className="text-xs text-slate-400 mt-1">Detailed review is available for quizzes taken after the latest update.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(attempt.questions || []).map((q, i) => {
                  const ans = attempt.answers?.[q.id] ?? attempt.answers?.[String(q.id)] ?? attempt.answers?.[Number(q.id)];
                  return <QuestionReview key={q.id ?? i} q={q} answer={ans} index={i + 1}/>;
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function QuizHistory() {
  const { user }                   = useAuth();
  const [attempts,  setAttempts]   = useState([]);
  const [loading,   setLoading]    = useState(true);
  const [error,     setError]      = useState(null);
  const [lvlFilter, setLvlFilter]  = useState('all');

  const load = () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    api.getAttempts(user.id)
      .then(data => {
        setAttempts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load quiz history.');
        setLoading(false);
      });
  };

  useEffect(load, [user?.id]);

  // Assign sequential attempt number per level (chronological order)
  const attemptsWithNumbers = useMemo(() => {
    const countByLevel = {};
    return [...attempts]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(a => {
        const k = String(a.levelId);
        countByLevel[k] = (countByLevel[k] || 0) + 1;
        return { ...a, attemptNum: countByLevel[k] };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attempts]);


  // Level filter options derived from actual data — no hardcoded list
  const levelFilterOptions = useMemo(() => {
    const seen = new Map();
    attemptsWithNumbers.forEach(a => {
      const k = String(a.levelId);
      if (!seen.has(k)) seen.set(k, a.levelTitle || `Level ${a.levelId}`);
    });
    return Array.from(seen.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([k, l]) => ({ k, l }));
  }, [attemptsWithNumbers]);

  const filtered = useMemo(
    () => lvlFilter === 'all'
      ? attemptsWithNumbers
      : attemptsWithNumbers.filter(a => String(a.levelId) === lvlFilter),
    [attemptsWithNumbers, lvlFilter]
  );

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const total  = filtered.length;
    const passed = filtered.filter(a => (a.score?.pct ?? 0) >= 50).length;
    const avg    = Math.round(filtered.reduce((s, a) => s + (a.score?.pct ?? 0), 0) / total);
    const best   = Math.max(...filtered.map(a => a.score?.pct ?? 0));
    return { total, passed, avg, best };
  }, [filtered]);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">
        <div className="sticky top-0 z-30 -mt-6 py-4 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100">
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Quiz History</h1>
          <p className="text-sm text-slate-400 mt-0.5">Review all attempts with answer analysis and explanations</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-100 rounded-xl mb-3"/>
              <div className="h-6 bg-slate-100 rounded w-16 mb-1"/>
              <div className="h-3 bg-slate-100 rounded w-20"/>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0"/>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/3"/>
                  <div className="h-3 bg-slate-100 rounded w-1/2"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Quiz History</h1>
        </div>
        <div className="mt-6 bg-white rounded-2xl border border-red-100 shadow-sm p-12 text-center">
          <XCircle size={40} className="text-red-300 mx-auto mb-4"/>
          <h2 className="text-lg font-bold text-slate-700 mb-2">Failed to load history</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button onClick={load}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
            <RefreshCw size={15}/> Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (attempts.length === 0) {
    return (
      <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Quiz History</h1>
          <p className="text-sm text-slate-400 mt-0.5">Review all attempts with answer analysis and explanations</p>
        </div>
        <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <BookOpen size={40} className="text-slate-300 mx-auto mb-4"/>
          <h2 className="text-lg font-bold text-slate-700 mb-2">No attempts yet</h2>
          <p className="text-slate-400 text-sm mb-6">Complete a level quiz to see your history here.</p>
          <a href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
            Go to Dashboard <ArrowRight size={15}/>
          </a>
        </div>
      </div>
    );
  }

  // ── Data view ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Quiz History</h1>
          <p className="text-sm text-slate-400 mt-0.5">Review all attempts with answer analysis and explanations</p>
        </div>
        <button onClick={load} title="Refresh"
          className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Attempts',   val: stats.total,       color: '#4F46E5', icon: <BookOpen size={18}/> },
            { label: 'Best Score', val: `${stats.best}%`,  color: '#4F46E5', icon: <Trophy size={18}/> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color + '15', color: s.color }}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{s.val}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Color legend */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Answer Color Key</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block"/> Correct Answer</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"/> Wrong Answer</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-slate-200 inline-block"/> Unattempted / Skipped</span>
        </div>
      </div>

      {/* Level filter — only shows levels that have real attempts */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-400"/>
        <span className="text-xs font-semibold text-slate-500">Filter by level:</span>
        {[{ k: 'all', l: 'All' }, ...levelFilterOptions].map(t => (
          <button key={t.k} onClick={() => setLvlFilter(t.k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              lvlFilter === t.k
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {t.l}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">
          {lvlFilter === 'all'
            ? `${filtered.length} total attempt${filtered.length !== 1 ? 's' : ''}`
            : `${filtered.length} attempt${filtered.length !== 1 ? 's' : ''} for this level`}
        </span>
      </div>

      {/* Attempt list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
            <p className="text-slate-400 text-sm">No attempts for this level yet.</p>
          </div>
        ) : (
          filtered.map(attempt => (
            <AttemptCard
              key={attempt.id ?? attempt.date}
              attempt={attempt}
            />
          ))
        )}
      </div>
    </div>
  );
}

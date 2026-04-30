import { useState, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, Minus, Trophy, ChevronDown, ChevronUp,
  Calendar, Target, BookOpen, ArrowRight, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentAttempts } from '../../utils/quizGenerator';
import { CATEGORY_META, CATEGORIES } from '../../utils/questionBank';
import { formatDuration } from '../../utils/helpers';

const LEVEL_COLORS = {
  1: { from: '#3BC0EF', to: '#1E3A8A' },
  2: { from: '#8B5CF6', to: '#6d28d9' },
  3: { from: '#10B981', to: '#047857' },
};

function ScoreBadge({ pct }) {
  const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#F59E0B' : '#dc2626';
  const bg    = pct >= 75 ? '#f0fdf4' : pct >= 50 ? '#fffbeb' : '#fef2f2';
  return (
    <span className="font-bold text-sm px-2.5 py-1 rounded-full" style={{ color, background: bg }}>
      {pct}%
    </span>
  );
}

// ─── Single question review ───────────────────────────────────────────────
function QuestionReview({ q, answer, index }) {
  const catMeta  = CATEGORY_META[q.category] || { label: q.category, color: '#64748b', bg: '#f8fafc' };
  const isSkipped = answer === undefined || answer === null;
  let isCorrect = false;
  if (!isSkipped) {
    if (q.type === 'match') {
      isCorrect = typeof answer === 'object' && q.pairs.every((_, i) => answer[i] === i);
    } else {
      isCorrect = answer === q.correct;
    }
  }
  const statusColor = isSkipped ? '#94a3b8' : isCorrect ? '#16a34a' : '#dc2626';
  const statusBg    = isSkipped ? '#f8fafc'  : isCorrect ? '#f0fdf4' : '#fef2f2';

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: statusColor + '30' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: statusBg, borderColor: statusColor + '20' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: statusColor, color:'#fff' }}>
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
        {q.type === 'image' && q.imageUrl && (
          <img src={q.imageUrl} alt="question" className="w-full h-32 object-cover rounded-xl border border-slate-100 mb-2"/>
        )}

        {(q.type === 'mcq' || q.type === 'image' || q.type === 'tf') && q.options && (
          <div className="grid gap-1.5">
            {q.options.map((opt, i) => {
              const isSelected        = answer === i;
              const isActuallyCorrect = i === q.correct;
              let cls = 'border-slate-200 bg-slate-50 text-slate-500';
              if (isActuallyCorrect) cls = 'border-green-300 bg-green-50 text-green-700 font-semibold';
              if (isSelected && !isActuallyCorrect) cls = 'border-red-300 bg-red-50 text-red-700 font-semibold';
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActuallyCorrect ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{opt}</span>
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
              const selIdx        = answer ? answer[i] : undefined;
              const isCorrectPair = selIdx === i;
              const selRight      = selIdx !== undefined ? (q.pairs[selIdx]?.right || '?') : null;
              return (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
                  selIdx === undefined ? 'border-slate-200 bg-slate-50' :
                  isCorrectPair ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <span className="flex-1 font-medium text-slate-700">{pair.left}</span>
                  <span className="text-slate-400 shrink-0">→</span>
                  <span className={`flex-1 font-semibold ${
                    selIdx === undefined ? 'text-slate-400' : isCorrectPair ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selRight || <span className="text-slate-400 italic">Not answered</span>}
                    {!isCorrectPair && selIdx !== undefined && (
                      <span className="text-green-700 ml-1 font-normal">(correct: {pair.right})</span>
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

        {q.explanation && (
          <div className="mt-2 bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 border border-blue-100">
            <span className="font-bold">Explanation: </span>{q.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Attempt card ─────────────────────────────────────────────────────────
function AttemptCard({ attempt }) {
  const [open, setOpen] = useState(false);
  const lvl    = LEVEL_COLORS[attempt.levelId] || { from:'#4F46E5', to:'#6d28d9' };
  const passed = (attempt.score?.pct ?? 0) >= 50;
  const date   = attempt.date ? new Date(attempt.date) : null;

  const catBreakdown = useMemo(() => {
    const qs  = attempt.questions || [];
    const ans = attempt.answers   || {};
    return CATEGORIES.map(cat => {
      const catQs   = qs.filter(q => q.category === cat);
      const correct = catQs.filter(q => {
        const a = ans[q.id];
        if (a == null) return false;
        if (q.type === 'match') return typeof a === 'object' && q.pairs.every((_, i) => a[i] === i);
        return a === q.correct;
      }).length;
      return { cat, meta: CATEGORY_META[cat] || { label: cat, color:'#64748b', bg:'#f8fafc' }, total: catQs.length, correct };
    });
  }, [attempt]);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${open ? 'border-indigo-200' : 'border-slate-100'}`}>
      <button onClick={() => setOpen(p => !p)} className="w-full text-left">
        <div className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ background: `linear-gradient(135deg, ${lvl.from}, ${lvl.to})` }}>
            L{attempt.levelId}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-bold text-slate-800">{attempt.levelTitle || `Level ${attempt.levelId}`}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {passed ? '✓ Passed' : '✗ Failed'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              {date && (
                <span className="flex items-center gap-1">
                  <Calendar size={10}/> {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                </span>
              )}
              <span className="flex items-center gap-1"><Clock size={10}/> {formatDuration(attempt.score?.timeTaken || 0)}</span>
              <span className="flex items-center gap-1"><Target size={10}/> {attempt.score?.correct || 0}/{attempt.score?.total || 0}</span>
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
          {/* Category breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {catBreakdown.map(({ cat, meta, total, correct }) => (
              <div key={cat} className="rounded-xl p-3 text-center" style={{ background: meta.bg }}>
                <p className="text-base font-bold" style={{ color: meta.color }}>{correct}/{total}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{meta.label}</p>
                <div className="mt-1.5 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className="h-1.5 rounded-full" style={{ width: `${total ? (correct/total)*100 : 0}%`, background: meta.color }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Score grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label:'Correct', val: attempt.score?.correct ?? 0, color:'#16a34a', bg:'#f0fdf4' },
              { label:'Wrong',   val: attempt.score?.wrong ?? 0,   color:'#dc2626', bg:'#fef2f2' },
              { label:'Skipped', val: (attempt.score?.total ?? 0) - (attempt.score?.correct ?? 0) - (attempt.score?.wrong ?? 0),
                color:'#64748b', bg:'#f8fafc' },
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
            <div className="space-y-3">
              {(attempt.questions || []).map((q, i) => (
                <QuestionReview key={q.id || i} q={q} answer={attempt.answers?.[q.id]} index={i + 1}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function QuizHistory() {
  const { user }     = useAuth();
  const attempts     = getStudentAttempts(user?.uniqueId);
  const [lvlFilter, setLvlFilter] = useState('all');

  const filtered = lvlFilter === 'all' ? attempts : attempts.filter(a => String(a.levelId) === lvlFilter);

  const stats = useMemo(() => {
    if (!attempts.length) return null;
    const total  = attempts.length;
    const passed = attempts.filter(a => (a.score?.pct ?? 0) >= 50).length;
    const avg    = Math.round(attempts.reduce((s, a) => s + (a.score?.pct ?? 0), 0) / total);
    const best   = Math.max(...attempts.map(a => a.score?.pct ?? 0));
    return { total, passed, avg, best };
  }, [attempts]);

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Quiz History</h1>
        <p className="text-sm text-slate-400 mt-0.5">Review all attempts with answer analysis and explanations</p>
      </div>

      {attempts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <BookOpen size={40} className="text-slate-300 mx-auto mb-4"/>
          <h2 className="text-lg font-bold text-slate-700 mb-2">No attempts yet</h2>
          <p className="text-slate-400 text-sm mb-6">Complete a level quiz to see your history here.</p>
          <a href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm">
            Go to Dashboard <ArrowRight size={15}/>
          </a>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label:'Attempts',   val: stats.total,        color:'#4F46E5', icon:<BookOpen size={18}/> },
                { label:'Passed',     val: stats.passed,       color:'#10B981', icon:<CheckCircle size={18}/> },
                { label:'Avg Score',  val: `${stats.avg}%`,    color:'#F59E0B', icon:<Target size={18}/> },
                { label:'Best Score', val: `${stats.best}%`,   color:'#EF4444', icon:<Trophy size={18}/> },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.color+'15', color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>{s.val}</p>
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
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block"/> Unattempted / Skipped</span>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-400"/>
            <span className="text-xs font-semibold text-slate-500">Filter by level:</span>
            {[{k:'all',l:'All'},{k:'1',l:'Level 1'},{k:'2',l:'Level 2'},{k:'3',l:'Level 3'}].map(t => (
              <button key={t.k} onClick={() => setLvlFilter(t.k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  lvlFilter === t.k ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>{t.l}</button>
            ))}
            <span className="text-xs text-slate-400 ml-auto">
              Showing {filtered.length} of {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <p className="text-slate-400 text-sm">No attempts for this level yet.</p>
              </div>
            ) : (
              filtered.map(attempt => <AttemptCard key={attempt.id || attempt.date} attempt={attempt}/>)
            )}
          </div>
        </>
      )}
    </div>
  );
}

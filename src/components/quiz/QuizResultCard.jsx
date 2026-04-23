import { useState } from 'react';
import {
  CheckCircle, XCircle, Minus, Clock, Trophy,
  ShieldAlert, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { mockQuestions } from '../../utils/mockData';
import { formatDuration } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';

// ─── Shared read-only result + answer-review card ────────────────────────────
// Props:
//   quiz    – quiz object  { id, title, … }
//   result  – from getQuizResult(quiz.id) — may be null
export default function QuizResultCard({ quiz, result }) {
  const { colors } = useTheme();
  const [showReview, setShowReview] = useState(false);

  // Reconstruct question objects from stored IDs
  const questions = result?.questionIds
    ? result.questionIds.map(id => mockQuestions.find(q => q.id === id)).filter(Boolean)
    : [];
  const answers = result?.answers || {};

  const submittedAt = result?.completedAt
    ? new Date(result.completedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : '—';

  const unanswered = questions.length > 0
    ? questions.filter(q => answers[q.id] === undefined).length
    : Math.max(0, (result?.total != null ? result.total / 2 : 0) - (result?.correct ?? 0) - (result?.wrong ?? 0));

  const sc =
    (result?.pct ?? 0) >= 75 ? { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' } :
    (result?.pct ?? 0) >= 50 ? { text: '#d97706', bg: '#fffbeb', border: '#fde68a' } :
                                { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' };

  const qStatus = (q) => {
    if (answers[q.id] === undefined) return 'unanswered';
    return answers[q.id] === q.correct ? 'correct' : 'wrong';
  };

  const ST = {
    correct:    { border: '#bbf7d0', bg: '#f0fdf4', badge: 'bg-green-100 text-green-700',  icon: <CheckCircle size={14} className="text-green-500" />, label: 'Correct'    },
    wrong:      { border: '#fecaca', bg: '#fef2f2', badge: 'bg-red-100 text-red-600',      icon: <XCircle    size={14} className="text-red-400" />,   label: 'Wrong'      },
    unanswered: { border: '#e2e8f0', bg: '#f8fafc', badge: 'bg-slate-100 text-slate-500',  icon: <Minus      size={14} className="text-slate-400" />,  label: 'Unanswered' },
  };

  return (
    <div className="space-y-4">

      {/* ── Result card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${colors.primary}12, ${colors.accent}08)`, borderBottom: '1px solid #f1f5f9' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk' }}>{quiz.title}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Quiz Completed</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1 shrink-0">
            <CheckCircle size={11} /> Completed
          </span>
        </div>

        <div className="p-5 space-y-4">

          {/* Score banner */}
          <div className="rounded-2xl p-5 text-center" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
            <Trophy size={26} className="mx-auto mb-2" style={{ color: sc.text }} />
            <p className="text-5xl font-bold" style={{ color: sc.text, fontFamily: 'Space Grotesk' }}>
              {result?.pct ?? '—'}%
            </p>
            <p className="text-sm font-semibold mt-1" style={{ color: sc.text }}>Final Score</p>
          </div>

          {/* Correct / Wrong / Unanswered */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <CheckCircle size={18} className="text-green-500" />, value: result?.correct ?? '—', label: 'Correct',    bg: 'bg-green-50' },
              { icon: <XCircle    size={18} className="text-red-400" />,   value: result?.wrong   ?? '—', label: 'Wrong',      bg: 'bg-red-50'   },
              { icon: <Minus      size={18} className="text-slate-400" />, value: unanswered,              label: 'Unanswered', bg: 'bg-slate-50' },
            ].map(item => (
              <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                <div className="flex justify-center mb-1">{item.icon}</div>
                <p className="text-xl font-bold text-slate-800">{item.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Meta info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl text-sm">
              <span className="text-slate-500 flex items-center gap-1.5"><Clock size={13} /> Time Taken</span>
              <span className="font-semibold text-slate-700">
                {result?.timeTaken != null ? formatDuration(result.timeTaken) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl text-sm">
              <span className="text-slate-500">Submitted</span>
              <span className="font-semibold text-slate-700">{submittedAt}</span>
            </div>
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
              style={{ background: '#fef9c3', border: '1px solid #fde68a' }}
            >
              <span className="text-yellow-700 font-semibold">Status</span>
              <span className="font-bold text-yellow-800">Attempt Used</span>
            </div>
          </div>

          {/* Permanent lock notice */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
            <ShieldAlert size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 font-medium">
              You have already used your one allowed attempt. This result is final and cannot be retaken.
            </p>
          </div>

          {/* View My Answers — always shown when questions are available */}
          <button
            onClick={() => setShowReview(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.98]"
            style={
              showReview
                ? { background: '#f1f5f9', color: '#475569' }
                : { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, color: '#fff', boxShadow: `0 4px 16px ${colors.primary}40` }
            }
          >
            {showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showReview ? 'Hide Answers' : 'View My Answers'}
          </button>
        </div>
      </div>

      {/* ── Read-only answer review ── */}
      {showReview && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            Answer Review — Read Only
          </p>

          {questions.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <p className="text-slate-400 text-sm">
                Answer details are not available for this submission.<br />
                They are saved starting from your next attempt.
              </p>
            </div>
          )}

          {questions.map((q, idx) => {
            const st      = qStatus(q);
            const sty     = ST[st];
            const userAns = answers[q.id];
            const isTF    = q.type === 'true_false';

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{ border: `1px solid ${sty.border}` }}
              >
                {/* Question row */}
                <div
                  className="px-4 py-3 flex items-start justify-between gap-3"
                  style={{ background: sty.bg, borderBottom: `1px solid ${sty.border}` }}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
                    >
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{q.text}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${sty.badge}`}>
                    {sty.icon} {sty.label}
                  </span>
                </div>

                {/* Options — pointer-events-none prevents any interaction */}
                <div className={`p-3 grid gap-2 pointer-events-none ${isTF ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {q.options.map((opt, i) => {
                    const isCorrect   = i === q.correct;
                    const isSelected  = i === userAns;
                    const isWrongPick = isSelected && !isCorrect;

                    let cls    = 'border-slate-200 bg-white text-slate-500';
                    let inline = {};

                    if (isCorrect && isSelected) {
                      cls    = 'border-transparent text-white';
                      inline = { background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 2px 8px #16a34a30' };
                    } else if (isCorrect) {
                      cls = 'border-green-300 bg-green-50 text-green-800';
                    } else if (isWrongPick) {
                      cls = 'border-red-300 bg-red-50 text-red-700';
                    }

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium select-none cursor-default ${isTF ? 'justify-center' : ''} ${cls}`}
                        style={inline}
                      >
                        {!isTF && (
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCorrect && isSelected ? 'bg-white/20 border-white/40 text-white'
                            : isCorrect  ? 'border-green-400 text-green-700'
                            : isWrongPick ? 'border-red-400 text-red-600'
                            : 'border-slate-300 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                        )}
                        <span className="flex-1">{opt}</span>
                        {isWrongPick && <XCircle    size={14} className="shrink-0 text-red-400" />}
                        {isCorrect   && <CheckCircle size={14} className={`shrink-0 ${isSelected ? 'text-white' : 'text-green-500'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {questions.length > 0 && (
            <p className="text-center text-xs text-slate-400 py-2">
              — End of review · Answers are read-only —
            </p>
          )}
        </div>
      )}
    </div>
  );
}

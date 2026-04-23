import { useState } from 'react';
import { CheckCircle, XCircle, Minus, Clock, Trophy, ShieldAlert, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { mockQuizzes, mockQuestions } from '../../utils/mockData';
import { formatDuration } from '../../utils/helpers';

export default function QuizHistory() {
  const { hasAttemptedQuiz, getQuizResult } = useAuth();
  const { colors } = useTheme();
  const location = useLocation();
  const [showReview, setShowReview] = useState(location.state?.openReview ?? false);

  const quiz      = mockQuizzes[0];
  const completed = hasAttemptedQuiz(quiz.id);
  const result    = getQuizResult(quiz.id);

  // Reconstruct the 10 questions from stored IDs
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
    : result
      ? (result.total != null ? result.total / 2 : 0) - (result.correct ?? 0) - (result.wrong ?? 0)
      : 0;

  const scoreColor =
    result?.pct >= 75 ? { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' } :
    result?.pct >= 50 ? { text: '#d97706', bg: '#fffbeb', border: '#fde68a' } :
                        { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' };

  // Per-question status
  const qStatus = (q) => {
    if (answers[q.id] === undefined) return 'unanswered';
    return answers[q.id] === q.correct ? 'correct' : 'wrong';
  };

  const STATUS_STYLE = {
    correct:    { border: '#bbf7d0', bg: '#f0fdf4', badge: 'bg-green-100 text-green-700',   icon: <CheckCircle size={15} className="text-green-500" />,  label: 'Correct'    },
    wrong:      { border: '#fecaca', bg: '#fef2f2', badge: 'bg-red-100 text-red-600',       icon: <XCircle    size={15} className="text-red-400" />,    label: 'Wrong'      },
    unanswered: { border: '#e2e8f0', bg: '#f8fafc', badge: 'bg-slate-100 text-slate-500',   icon: <Minus      size={15} className="text-slate-400" />,   label: 'Unanswered' },
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">

      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Quiz History</h1>
        <p className="text-slate-400 text-sm mt-0.5">Detailed analytics for your quiz attempt</p>
      </div>

      {/* ── Not attempted ── */}
      {!completed && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
          <BookOpen size={44} className="mx-auto mb-4 text-slate-200" />
          <p className="font-bold text-slate-600 text-lg mb-1">No result yet</p>
          <p className="text-slate-400 text-sm">Complete the quiz to see your result here.</p>
        </div>
      )}

      {/* ── Result card ── */}
      {completed && result && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${colors.primary}12, ${colors.accent}08)`, borderBottom: '1px solid #f1f5f9' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                <BookOpen size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk' }}>{quiz.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Quiz Completed</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
              <CheckCircle size={11} /> Completed
            </span>
          </div>

          <div className="p-5 space-y-4">

            {/* Score banner */}
            <div className="rounded-2xl p-5 text-center" style={{ background: scoreColor.bg, border: `1px solid ${scoreColor.border}` }}>
              <Trophy size={26} className="mx-auto mb-2" style={{ color: scoreColor.text }} />
              <p className="text-5xl font-bold" style={{ color: scoreColor.text, fontFamily: 'Space Grotesk' }}>
                {result.pct ?? '—'}%
              </p>
              <p className="text-sm font-semibold mt-1" style={{ color: scoreColor.text }}>Final Score</p>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <CheckCircle size={18} className="text-green-500" />, value: result.correct ?? '—', label: 'Correct',    bg: 'bg-green-50'  },
                { icon: <XCircle    size={18} className="text-red-400" />,   value: result.wrong   ?? '—', label: 'Wrong',      bg: 'bg-red-50'    },
                { icon: <Minus      size={18} className="text-slate-400" />, value: unanswered,             label: 'Unanswered', bg: 'bg-slate-50'  },
              ].map(item => (
                <div key={item.label} className={`${item.bg} rounded-xl p-3 text-center`}>
                  <div className="flex justify-center mb-1">{item.icon}</div>
                  <p className="text-xl font-bold text-slate-800">{item.value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Meta row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl text-sm">
                <span className="text-slate-500 flex items-center gap-1.5"><Clock size={13} /> Time Taken</span>
                <span className="font-semibold text-slate-700">
                  {result.timeTaken != null ? formatDuration(result.timeTaken) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl text-sm">
                <span className="text-slate-500">Submitted</span>
                <span className="font-semibold text-slate-700">{submittedAt}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
                style={{ background: '#fef9c3', border: '1px solid #fde68a' }}>
                <span className="text-yellow-700 font-semibold">Status</span>
                <span className="font-bold text-yellow-800">Attempt Used</span>
              </div>
            </div>

            {/* One-attempt notice */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
              <ShieldAlert size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">
                You have already used your one allowed attempt. This result is final and cannot be retaken.
              </p>
            </div>

            {/* View My Answers button */}
            {questions.length > 0 && (
              <button
                onClick={() => setShowReview(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
                style={{
                  background: showReview ? '#f1f5f9' : `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                  color: showReview ? '#475569' : '#fff',
                  boxShadow: showReview ? 'none' : `0 4px 16px ${colors.primary}40`,
                }}
              >
                {showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showReview ? 'Hide Answers' : 'View My Answers'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Answer Review Panel ── */}
      {showReview && questions.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
            Answer Review — Read Only
          </p>
          {questions.map((q, idx) => {
            const st  = qStatus(q);
            const sty = STATUS_STYLE[st];
            const userAns = answers[q.id];

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
                style={{ border: `1px solid ${sty.border}` }}
              >
                {/* Question header */}
                <div className="px-4 py-3 flex items-center justify-between gap-3"
                  style={{ background: sty.bg, borderBottom: `1px solid ${sty.border}` }}>
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{q.text}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 ${sty.badge}`}>
                    {sty.icon} {sty.label}
                  </span>
                </div>

                {/* Options */}
                <div className={`p-3 grid gap-2 ${q.type === 'true_false' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {q.options.map((opt, i) => {
                    const isCorrect  = i === q.correct;
                    const isSelected = i === userAns;
                    const isWrongPick = isSelected && !isCorrect;

                    let optStyle = 'border-slate-200 bg-slate-50 text-slate-600';
                    let optInline = {};

                    if (isCorrect && isSelected) {
                      // User picked the right answer → solid green
                      optStyle = 'border-transparent text-white';
                      optInline = { background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 2px 8px #16a34a40' };
                    } else if (isCorrect) {
                      // Correct answer user didn't pick → outlined green
                      optStyle = 'border-green-300 bg-green-50 text-green-800';
                    } else if (isWrongPick) {
                      // User's wrong choice → red
                      optStyle = 'border-red-300 bg-red-50 text-red-700';
                    }

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium select-none
                          ${q.type === 'true_false' ? 'justify-center' : ''} ${optStyle}`}
                        style={optInline}
                      >
                        {q.type !== 'true_false' && (
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0
                            ${isCorrect && isSelected ? 'bg-white/20 border-white/40 text-white'
                            : isCorrect ? 'border-green-400 text-green-700'
                            : isWrongPick ? 'border-red-400 text-red-600'
                            : 'border-slate-300 text-slate-400'}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                        )}
                        <span>{opt}</span>
                        {isSelected && !isCorrect && (
                          <XCircle size={14} className="ml-auto text-red-400 shrink-0" />
                        )}
                        {isCorrect && (
                          <CheckCircle size={14} className={`ml-auto shrink-0 ${isSelected ? 'text-white' : 'text-green-500'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <p className="text-center text-xs text-slate-400 py-2">
            — End of review · Answers are read-only —
          </p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { mockQuizzes, mockQuestions } from '../../utils/mockData';
import { formatDuration } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const TOTAL_QUESTIONS  = 10;
const QUIZ_DURATION    = 600;
const DIFF_ORDER       = ['easy','easy','medium','medium','hard','medium','hard','easy','medium','hard'];

function buildQuestionSet() {
  const pools = {
    easy:   mockQuestions.filter(q => q.difficulty === 'easy'),
    medium: mockQuestions.filter(q => q.difficulty === 'medium'),
    hard:   mockQuestions.filter(q => q.difficulty === 'hard'),
  };
  const used = new Set();
  const seq  = [];
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const diff   = DIFF_ORDER[i] || 'medium';
    const pool   = pools[diff].filter(q => !used.has(q.id));
    const chosen = pool.length > 0 ? pool[0] : mockQuestions.find(q => !used.has(q.id));
    if (!chosen) break;
    used.add(chosen.id);
    seq.push(chosen);
  }
  return seq;
}

function timerState(t) {
  if (t <= 30)  return 'critical';
  if (t <= 120) return 'warning';
  return 'normal';
}

export default function QuizAttempt() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const { colors } = useTheme();
  const { markQuizComplete, markQuizStarted, hasAttemptedQuiz } = useAuth();

  const quiz = mockQuizzes.find(q => q.id === id) || mockQuizzes[0];

  // Block re-attempt; mark started immediately
  useEffect(() => {
    if (hasAttemptedQuiz(id)) navigate('/quizzes', { replace: true });
    else markQuizStarted(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // All questions pre-built upfront
  const [questions]    = useState(() => buildQuestionSet());
  const [current,      setCurrent]    = useState(0);
  const [answers,      setAnswers]    = useState({});
  const [panelFilter,  setPanelFilter] = useState('all'); // 'all' | 'answered' | 'unanswered'
  const [timeLeft,     setTimeLeft]   = useState(QUIZ_DURATION);
  const [timesUp,      setTimesUp]    = useState(false);
  const [showSubmit,   setShowSubmit] = useState(false);
  const [saved,        setSaved]      = useState(false);

  const startRef = useRef(new Date());

  const computeScore = useCallback((qs) => {
    const correct = qs.filter(q => answers[q.id] === q.correct).length;
    const wrong   = qs.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
    const total   = qs.length * 2;
    const marks   = correct * 2;
    const pct     = total > 0 ? Math.round((marks / total) * 100) : 0;
    return { correct, wrong, total, pct };
  }, [answers]);

  // Countdown
  useEffect(() => {
    if (timesUp || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timesUp, timeLeft]);

  // Trigger time-up
  useEffect(() => {
    if (timeLeft <= 0 && !timesUp) setTimesUp(true);
  }, [timeLeft, timesUp]);

  // Auto-submit on time-up
  useEffect(() => {
    if (!timesUp) return;
    const t = setTimeout(() => {
      const score = computeScore(questions);
      markQuizComplete(id, { ...score, timeTaken: QUIZ_DURATION, questions, answers });
      navigate(`/quiz/${id}/result`, {
        state: { answers, questions, timeLeft: 0, startTime: startRef.current.toISOString(), autoSubmitted: true },
      });
    }, 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesUp]);

  // Autosave indicator
  useEffect(() => {
    const t = setTimeout(() => { setSaved(true); setTimeout(() => setSaved(false), 1800); }, 700);
    return () => clearTimeout(t);
  }, [answers]);

  const goNext    = () => setCurrent(c => Math.min(c + 1, questions.length - 1));
  const goBack    = () => setCurrent(c => Math.max(0, c - 1));
  const handleAnswer = (qId, idx) => setAnswers(p => ({ ...p, [qId]: idx }));

  const handleSubmit = () => {
    const score = computeScore(questions);
    markQuizComplete(id, { ...score, timeTaken: QUIZ_DURATION - timeLeft, questions, answers });
    navigate(`/quiz/${id}/result`, {
      state: { answers, questions, timeLeft, startTime: startRef.current.toISOString() },
    });
  };

  const q            = questions[current];
  const answered     = Object.keys(answers).length;
  const tState       = timerState(timeLeft);
  const progress     = ((current + 1) / TOTAL_QUESTIONS) * 100;
  const timerBarPct  = (timeLeft / QUIZ_DURATION) * 100;
  const isLast       = current === questions.length - 1;

  const timerStyle = {
    normal:   { bg: 'bg-slate-50',  text: 'text-slate-800', icon: 'text-slate-400',  bar: colors.primary },
    warning:  { bg: 'bg-orange-50', text: 'text-orange-600',icon: 'text-orange-400', bar: '#f97316' },
    critical: { bg: 'bg-red-50',    text: 'text-red-600',   icon: 'text-red-500',    bar: '#ef4444' },
  }[tState];

  const getQStatus = (idx) => {
    const qId = questions[idx]?.id;
    if (answers[qId] !== undefined) return 'answered';
    if (idx === current)            return 'current';
    return 'unanswered';
  };

  // Filter: only dim non-matching in the grid
  const isVisible = (idx) => {
    if (panelFilter === 'all') return true;
    const qId = questions[idx]?.id;
    return panelFilter === 'answered'
      ? answers[qId] !== undefined
      : answers[qId] === undefined;
  };

  if (!q) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── TIME'S UP OVERLAY ── */}
      {timesUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm mx-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
              Time's Up!
            </h2>
            <p className="text-slate-500 text-sm mb-5">Your quiz is being submitted automatically…</p>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-1.5 bg-red-400 rounded-full animate-[shrink_2.5s_linear_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER: title + timer only ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm px-4 md:px-6 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <p className="font-bold text-slate-800 text-sm truncate">{quiz.title}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saved && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle size={12} /> Saved
            </span>
          )}
          {/* Countdown timer */}
          <div className={`flex items-center gap-1.5 font-bold text-base px-3 py-1.5 rounded-xl ${timerStyle.bg} ${timerStyle.text} ${tState === 'critical' ? 'animate-pulse' : ''}`}>
            <Clock size={15} className={timerStyle.icon} />
            <span className="font-mono tabular-nums">{formatDuration(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* ── QUESTION PROGRESS BAR ── */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
            Q {current + 1} / {TOTAL_QUESTIONS}
          </span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answered / TOTAL_QUESTIONS) * 100}%`, background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})` }}
            />
          </div>
          <span className="text-[11px] font-semibold shrink-0" style={{ color: colors.primary }}>
            {answered} answered
          </span>
        </div>
      </div>
      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Question card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: `${colors.primary}15`, color: colors.primary }}
                >
                  {q.label}
                </span>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: q.type === 'true_false' ? '#fef9c3' : '#eff6ff',
                    color:      q.type === 'true_false' ? '#854d0e' : '#1d4ed8',
                  }}
                >
                  {q.type === 'true_false' ? 'True / False' : 'Multiple Choice'}
                </span>
              </div>

              <div className="flex items-start gap-3 mb-6">
                <span
                  className="w-8 h-8 rounded-lg text-white text-sm font-bold flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
                >
                  {current + 1}
                </span>
                <p className="text-slate-800 font-semibold leading-relaxed text-base">{q.text}</p>
              </div>

              <div className={`grid gap-3 ${q.type === 'true_false' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {q.options.map((opt, i) => {
                  const selected = answers[q.id] === i;
                  const isTF     = q.type === 'true_false';
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(q.id, i)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        selected
                          ? 'border-transparent text-white'
                          : 'border-slate-200 bg-white hover:border-[#3BC0EF] hover:bg-[#3BC0EF08] text-slate-700'
                      } ${isTF ? 'justify-center' : ''}`}
                      style={selected ? {
                        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                        boxShadow:  `0 4px 14px ${colors.primary}40`,
                      } : {}}
                    >
                      {!isTF && (
                        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                          selected ? 'bg-white/20 border-white/40 text-white' : 'border-slate-300 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                      )}
                      <span className={`text-sm font-semibold ${isTF ? 'text-base' : ''}`}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={goBack}
                disabled={current === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="flex-1 text-center text-xs text-slate-400">
                {answers[q.id] !== undefined ? (
                  <span className="text-green-600 font-medium flex items-center justify-center gap-1">
                    <CheckCircle size={13} /> Answered
                  </span>
                ) : (
                  <span>Not answered yet</span>
                )}
              </div>

              {isLast ? (
                <button
                  onClick={() => setShowSubmit(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 14px #10B98150' }}
                >
                  Finish <CheckCircle size={16} />
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, boxShadow: `0 4px 14px ${colors.primary}40` }}
                >
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── SIDE PANEL ── */}
        <div className="hidden md:flex flex-col w-[220px] bg-white border-l border-slate-100 p-4 shrink-0 overflow-y-auto">

          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Questions</p>

          {/* Filter tabs */}
          <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-3">
            {[
              { key: 'all',        label: 'All' },
              { key: 'answered',   label: 'Answered' },
              { key: 'unanswered', label: 'Not Ans.' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setPanelFilter(f => f === tab.key && tab.key !== 'all' ? 'all' : tab.key)}
                className="flex-1 py-1.5 text-[10px] font-bold transition-all"
                style={
                  panelFilter === tab.key
                    ? { background: colors.primary, color: '#fff' }
                    : { background: '#f8fafc', color: '#64748b' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Question grid — all 10 clickable */}
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => {
              const st      = getQStatus(i);
              const visible = isVisible(i);
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                    !visible
                      ? 'opacity-20'
                      : st === 'answered'
                        ? 'text-white'
                        : st === 'current'
                          ? 'text-white ring-2'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={
                    st === 'answered' ? { background: colors.primary } :
                    st === 'current'  ? { background: colors.accent }  : {}
                  }
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="space-y-1.5 mb-4">
            {[
              { style: { background: colors.primary },          label: 'Answered'     },
              { bg: 'bg-slate-100 border border-slate-200',     label: 'Not Answered' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${item.bg || ''}`} style={item.style || {}} />
                <span className="text-xs text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Score + submit */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {answered}<span className="text-base text-slate-400">/{TOTAL_QUESTIONS}</span>
              </p>
              <p className="text-xs text-slate-400">Answered</p>
            </div>

            <button
              onClick={() => setShowSubmit(true)}
              className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
            >
              Submit Quiz
            </button>
          </div>
        </div>
      </div>

      {/* ── SUBMIT MODAL ── */}
      <Modal
        isOpen={showSubmit}
        onClose={() => setShowSubmit(false)}
        title="Submit Quiz?"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCurrent(0); setShowSubmit(false); }}>
              Review Answers
            </Button>
            <Button variant="success" onClick={handleSubmit} icon={<CheckCircle size={15} />}>
              Confirm Submit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: `linear-gradient(135deg, ${colors.primary}10, ${colors.accent}08)`, border: `1px solid ${colors.primary}25` }}
          >
            <p className="text-base font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
              Are you sure you want to submit?
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Time remaining:{' '}
              <span className={`font-semibold ${timerStyle.text}`}>{formatDuration(timeLeft)}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xl font-bold text-green-700">{answered}</p>
              <p className="text-xs text-green-600">Answered</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xl font-bold text-slate-600">{questions.length - answered}</p>
              <p className="text-xs text-slate-500">Not Answered</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

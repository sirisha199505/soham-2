import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Minus,
  Trophy, Shuffle, LayoutGrid, X, BookOpen, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { LEVELS } from '../../utils/levelData';
import { formatDuration } from '../../utils/helpers';
import { generateLevelQuiz, recordUsedQuestions, saveQuizAttempt } from '../../utils/quizGenerator';
import { CATEGORY_META, CATEGORIES } from '../../utils/questionBank';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

function timerState(t) {
  if (t <= 30)  return 'critical';
  if (t <= 120) return 'warning';
  return 'normal';
}

// ─── Inline question review (shown on result screen) ─────────────────────
function ResultQuestionCard({ q, answer, index, levelColor }) {
  const catMeta = CATEGORY_META[q.category] || { label: q.category, color: '#64748b', bg: '#f8fafc' };
  const isSkipped = answer === undefined || answer === null;
  let isCorrect = false;
  if (!isSkipped) {
    if (q.type === 'match') {
      isCorrect = typeof answer === 'object' && q.pairs?.every((_, i) => answer[i] === i);
    } else {
      isCorrect = answer === q.correct;
    }
  }
  const statusColor = isSkipped ? '#94a3b8' : isCorrect ? '#16a34a' : '#dc2626';
  const statusBg    = isSkipped ? '#f8fafc'  : isCorrect ? '#f0fdf4' : '#fef2f2';

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: statusColor + '40' }}>
      {/* Question header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: statusBg, borderColor: statusColor + '20' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
          style={{ background: statusColor }}>
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1.5"
            style={{ background: catMeta.bg, color: catMeta.color }}>{catMeta.label}</span>
          <span className="text-sm font-semibold text-slate-800">{q.text}</span>
        </div>
        <div className="shrink-0 text-xs font-bold">
          {isSkipped
            ? <span className="flex items-center gap-1 text-slate-400"><Minus size={12}/> Skipped</span>
            : isCorrect
              ? <span className="flex items-center gap-1 text-green-600"><CheckCircle size={13}/> Correct</span>
              : <span className="flex items-center gap-1 text-red-600"><XCircle size={13}/> Wrong</span>}
        </div>
      </div>

      {/* Options / pairs */}
      <div className="px-4 py-3 space-y-2">
        {(q.type === 'mcq' || q.type === 'image' || q.type === 'tf') && Array.isArray(q.options) && (
          <div className="grid gap-1.5">
            {q.options.map((opt, i) => {
              const text = typeof opt === 'string' ? opt : (opt?.text || '');
              const isSelected = answer === i;
              const isCor = i === q.correct;
              let cls = 'border-slate-200 bg-slate-50 text-slate-500';
              if (isCor) cls = 'border-green-300 bg-green-50 text-green-700 font-semibold';
              if (isSelected && !isCor) cls = 'border-red-300 bg-red-50 text-red-700 font-semibold';
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCor ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{text}</span>
                  {isSelected && !isCor && <span className="text-[10px] text-red-400 italic">(your answer)</span>}
                  {isCor && <CheckCircle size={12} className="text-green-500 shrink-0"/>}
                  {isSelected && !isCor && <XCircle size={12} className="text-red-500 shrink-0"/>}
                </div>
              );
            })}
          </div>
        )}

        {q.type === 'match' && q.pairs && (
          <div className="space-y-1.5">
            {q.pairs.map((pair, i) => {
              const selIdx = answer ? answer[i] : undefined;
              const isCor  = selIdx === i;
              const selRight = selIdx !== undefined ? (q.pairs[selIdx]?.right || '?') : null;
              return (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
                  selIdx === undefined ? 'border-slate-200 bg-slate-50' :
                  isCor ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <span className="flex-1 font-medium text-slate-700">{pair.left}</span>
                  <span className="text-slate-400 shrink-0">→</span>
                  <span className={`flex-1 font-semibold ${
                    selIdx === undefined ? 'text-slate-400' : isCor ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selRight || <span className="text-slate-400 italic">Not answered</span>}
                    {!isCor && selIdx !== undefined && <span className="text-green-700 ml-1 font-normal">(correct: {pair.right})</span>}
                  </span>
                  {selIdx !== undefined && (isCor
                    ? <CheckCircle size={11} className="text-green-500 shrink-0"/>
                    : <XCircle size={11} className="text-red-500 shrink-0"/>)}
                </div>
              );
            })}
          </div>
        )}

        {q.explanation && (
          <div className="mt-1 bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 border border-blue-100">
            <span className="font-bold">Explanation: </span>{q.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Backward-compat helpers for image-enriched options/pairs ────────────
function getOptText(opt)  { return typeof opt === 'string' ? opt : (opt?.text || ''); }
function getOptImage(opt) { return typeof opt === 'string' ? '' : (opt?.imageUrl || ''); }

// ─── Match Question Renderer ──────────────────────────────────────────────
function MatchQuestion({ q, answer, onChange, levelColor }) {
  const cur = answer || {};
  const [shuffledRight] = useState(() => {
    const indices = q.pairs.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  });

  const handleSelect = (leftIdx, rightShuffledIdx) => {
    const newAns = { ...cur };
    Object.keys(newAns).forEach(k => {
      if (newAns[k] === rightShuffledIdx) delete newAns[k];
    });
    newAns[leftIdx] = rightShuffledIdx;
    onChange(newAns);
  };

  return (
    <div className="space-y-4">
      {q.pairs.map((pair, leftIdx) => (
        <div key={leftIdx} className="flex items-start gap-3">
          {/* Left */}
          <div className="flex-1 text-sm font-semibold text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 min-w-0">
            {pair.leftImage && (
              <img src={pair.leftImage} alt="" className="w-full h-20 object-cover rounded-lg mb-2 border border-slate-200"/>
            )}
            {pair.left && <span>{pair.left}</span>}
          </div>
          <span className="text-slate-400 text-lg shrink-0 mt-3">→</span>
          {/* Right options */}
          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
            {shuffledRight.map((rightOrigIdx) => {
              const rp = q.pairs[rightOrigIdx];
              const selected = cur[leftIdx] === rightOrigIdx;
              const usedByOther = Object.entries(cur).some(
                ([k, v]) => Number(k) !== leftIdx && v === rightOrigIdx
              );
              return (
                <button
                  key={rightOrigIdx}
                  onClick={() => handleSelect(leftIdx, rightOrigIdx)}
                  disabled={usedByOther}
                  className={`text-left text-xs font-medium px-3 py-2 rounded-lg border-2 transition-all ${
                    selected
                      ? 'text-white border-transparent'
                      : usedByOther
                        ? 'opacity-30 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                  style={selected ? {
                    background: `linear-gradient(135deg, ${levelColor.from}, ${levelColor.to})`,
                  } : {}}
                >
                  {rp.rightImage && (
                    <img src={rp.rightImage} alt="" className="w-full h-16 object-cover rounded-lg mb-1.5"/>
                  )}
                  {rp.right}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Score helper for match questions ─────────────────────────────────────
function isMatchCorrect(q, answer) {
  if (!answer) return false;
  for (let i = 0; i < q.pairs.length; i++) {
    const selectedRightIdx = answer[i];
    if (selectedRightIdx === undefined) return false;
    // selectedRightIdx is the original pairs index, so pairs[selectedRightIdx].right should == pairs[i].right
    if (selectedRightIdx !== i) return false;
  }
  return true;
}

function isAnswered(q, answer) {
  if (answer === undefined || answer === null) return false;
  if (q.type === 'match') {
    return typeof answer === 'object' && Object.keys(answer).length === q.pairs.length;
  }
  return answer !== undefined;
}

export default function LevelQuiz() {
  const { levelId }  = useParams();
  const id           = Number(levelId);
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { getLevelStatus, markLevelComplete, levelSettings, levelSettingsLoaded, refreshLevelSettings } = useLevel();
  const { colors }   = useTheme();

  const QUIZ_FALLBACK_COLORS = [
    { from: '#f59e0b', to: '#d97706' },
    { from: '#ec4899', to: '#db2777' },
    { from: '#14b8a6', to: '#0d9488' },
    { from: '#6366f1', to: '#4f46e5' },
  ];
  const staticLevel = LEVELS.find(l => l.id === id);
  const dbLevel     = levelSettings[id];
  const level       = staticLevel ?? (dbLevel ? {
    id,
    title:    dbLevel.title    || `Level ${id}`,
    subtitle: dbLevel.subtitle || '',
    color:    QUIZ_FALLBACK_COLORS[(id - 1) % QUIZ_FALLBACK_COLORS.length],
  } : null);

  const status = getLevelStatus(user?.uniqueId, id);

  // ── All state declarations must come before any useEffect ───────────────────
  const [questions,       setQuestions]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [quizStarted,     setQuizStarted]     = useState(false);
  const [current,         setCurrent]         = useState(0);
  const [answers,         setAnswers]         = useState({});
  const [panelFilter,     setPanelFilter]     = useState('all');
  const [timeLeft,        setTimeLeft]        = useState(null);
  const [timesUp,         setTimesUp]         = useState(false);
  const [showSubmit,      setShowSubmit]      = useState(false);
  const [result,          setResult]          = useState(null);
  const [saveError,       setSaveError]       = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showReview,      setShowReview]      = useState(false);

  const quizDuration  = useRef(600);
  const startRef      = useRef(new Date());
  const submittingRef = useRef(false);

  // ── Navigation guard ────────────────────────────────────────────────────────
  const quizInProgress = quizStarted && !result && !isSubmitting;

  // Redirect if locked or already completed (but not after submitting in this session)
  useEffect(() => {
    if (status === 'locked') navigate('/dashboard', { replace: true });
    if (status === 'completed' && !quizStarted && !result) navigate('/dashboard', { replace: true });
  }, [status, navigate, quizStarted, result]);

  // Refresh level settings on mount so recently-deleted levels redirect immediately
  useEffect(() => { refreshLevelSettings(); }, []);

  // Generate questions on mount (async API call)
  useEffect(() => {
    generateLevelQuiz(user?.uniqueId, id).then(qs => {
      setQuestions(qs.map(q => q.type === 'truefalse' ? { ...q, type: 'tf' } : q));
      setLoading(false);
    }).catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Block browser refresh / tab close / OS back gesture
  useEffect(() => {
    if (!quizInProgress) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [quizInProgress]);

  // Initialize timer from API-backed levelSettings once questions finish loading
  useEffect(() => {
    if (!loading && timeLeft === null) {
      const mins = Number(levelSettings[id]?.timeLimit);
      const dur = mins > 0 ? mins * 60 : 600;
      quizDuration.current = dur;
      setTimeLeft(dur);
    }
  }, [loading, levelSettings, id, timeLeft]);

  const computeScore = useCallback(() => {
    let correct = 0, wrong = 0;
    questions.forEach(q => {
      const ans = answers[q.id];
      if (ans === undefined || ans === null) return;
      if (q.type === 'match') {
        if (isMatchCorrect(q, ans)) correct++;
        else wrong++;
      } else {
        if (ans === q.correct) correct++;
        else wrong++;
      }
    });
    const total = questions.length;
    const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, wrong, total, pct, timeTaken: quizDuration.current - (timeLeft ?? 0) };
  }, [answers, questions, timeLeft]);

  // Countdown — only runs after student clicks "Start Exam" on the rules screen
  useEffect(() => {
    if (!quizStarted || timesUp || timeLeft === null || timeLeft <= 0 || result) return;
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [quizStarted, timesUp, timeLeft, result]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && !timesUp) setTimesUp(true);
  }, [timeLeft, timesUp]);

  useEffect(() => {
    if (!timesUp || result) return;
    const t = setTimeout(() => doSubmit(true), 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesUp]);

  useEffect(() => {
    const t = setTimeout(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }, 600);
    return () => clearTimeout(t);
  }, [answers]);

  // Retry a promise-returning function with exponential backoff.
  // Render free-tier can cold-start in 30–50 s; the api.js timeout is 55 s.
  // Three retries with 3 s / 8 s / 15 s gaps give the server time to warm up
  // without holding the student on the submission screen for too long.
  const withRetry = async (fn, retries = 3) => {
    const delays = [3000, 8000, 15000];
    let lastErr;
    for (let i = 0; i <= retries; i++) {
      try { return await fn(); } catch (err) {
        lastErr = err;
        if (i < retries) await new Promise(r => setTimeout(r, delays[i] ?? 15000));
      }
    }
    throw lastErr;
  };

  const doSubmit = async (auto = false) => {
    // Hard lock — prevents duplicate submissions even with concurrent clicks
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    const score = computeScore();

    // Strip base64 images — prevents quota overflow that would silently break Quiz History
    const compactQ = (q) => ({
      id:          q.id,
      category:    q.category,
      type:        q.type,
      text:        q.text || '',
      imageUrl:    (q.imageUrl || '').startsWith('data:') ? '' : (q.imageUrl || ''),
      options:     (Array.isArray(q.options) ? q.options : []).map(o => (typeof o === 'string' ? o : (o?.text || ''))),
      correct:     q.correct,
      pairs:       q.pairs?.map(p => ({ left: p.left || '', right: p.right || '' })),
      explanation: q.explanation || '',
    });

    const attemptData = {
      levelId:    id,
      levelTitle: level?.title || `Level ${id}`,
      date:       new Date().toISOString(),
      questions:  questions.map(compactQ),
      answers:    { ...answers },
      score,
    };

    // The two critical writes are retried independently so a cold-start timeout
    // on one call does not block or contaminate the other.
    // recordUsedQuestions is best-effort and never blocks the result screen.
    const [attemptSaved, progressSaved] = await Promise.allSettled([
      withRetry(() => saveQuizAttempt(user.uniqueId, attemptData)),
      withRetry(() => markLevelComplete(user.uniqueId, id, score)),
      recordUsedQuestions(user.uniqueId, questions.map(q => q.id)),
    ]);

    if (attemptSaved.status === 'rejected' || progressSaved.status === 'rejected') {
      console.error('Save failed after retries:',
        (attemptSaved.reason || progressSaved.reason)?.message);
      setSaveError(true);
    }

    setResult({ ...score, auto });
    setShowSubmit(false);
    // Keep isSubmitting true — exam is done, no need to re-enable the button
  };

  const goNext = () => setCurrent(c => Math.min(c + 1, questions.length - 1));
  const goBack = () => setCurrent(c => Math.max(0, c - 1));
  const handleAnswer  = (qId, val) => setAnswers(p => ({ ...p, [qId]: val }));

  const getQStatus = (idx) => {
    const q = questions[idx];
    if (!q) return 'unanswered';
    if (isAnswered(q, answers[q.id])) return 'answered';
    if (idx === current)              return 'current';
    return 'unanswered';
  };

  const isVisible = (idx) => {
    if (panelFilter === 'all') return true;
    const q = questions[idx];
    return panelFilter === 'answered'
      ? isAnswered(q, answers[q.id])
      : !isAnswered(q, answers[q.id]);
  };

  const q        = questions[current];
  const answered = questions.filter(q => isAnswered(q, answers[q.id])).length;
  const tState   = timerState(timeLeft);
  const isLast   = current === questions.length - 1;

  const timerStyle = {
    normal:   { bg: 'bg-slate-50',  text: 'text-slate-800', icon: 'text-slate-400'  },
    warning:  { bg: 'bg-orange-50', text: 'text-orange-600',icon: 'text-orange-400' },
    critical: { bg: 'bg-red-50',    text: 'text-red-600',   icon: 'text-red-500'    },
  }[tState];

  // Loading guard — wait for both questions and timer to initialize
  if (loading || timeLeft === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading quiz…</p>
        </div>
      </div>
    );
  }

  // No questions guard
  if (!questions.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <Shuffle size={40} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Questions Available</h2>
          <p className="text-slate-500 text-sm mb-6">The admin hasn't added any questions for this level yet.</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!level) {
    if (!levelSettingsLoaded) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading…</p>
          </div>
        </div>
      );
    }
    navigate('/dashboard', { replace: true });
    return null;
  }

  /* ── Rules & Regulations screen (shown before exam starts) ──────── */
  if (!quizStarted && !result) {
    const examRules = [
      'Read each question carefully before selecting your answer.',
      'You can navigate between questions using the question panel.',
      'Answers are auto-saved as you proceed.',
      'The timer starts when you click "Start Exam" and cannot be paused.',
      'You can review and change answers before final submission.',
      'Once submitted, answers cannot be changed.',
      'Do not refresh or close the browser tab during the exam.',
      'Each level can only be attempted once — your score is final.',
    ];
    const timeLimit = Number(levelSettings[id]?.timeLimit) || 10;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden">
          {/* Coloured header */}
          <div className="relative p-6 text-white overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-[40px] bg-white" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen size={28} />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Rules & Regulations</p>
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{level.title}</h2>
                <p className="text-white/80 text-sm">{level.subtitle}</p>
              </div>
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-3 mt-4">
              {[
                { label: 'Questions', value: `${questions.length} Qs` },
                { label: 'Time Limit', value: `${timeLimit} Min` },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <p className="text-white/70 text-xs">{m.label}</p>
                  <p className="text-white font-bold">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Rules list */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle size={15} className="text-amber-500" /> Instructions
              </h3>
              <ul className="space-y-2">
                {examRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                      style={{ background: level.color.from }}>
                      {i + 1}
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => navigate('/dashboard')}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button
                onClick={() => setQuizStarted(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                  boxShadow: `0 4px 16px ${level.color.from}40`,
                }}>
                Start Exam <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!level || !q) return null;

  /* ── Result screen ─────────────────────────────────────────────── */
  if (result) {
    const perf = result.pct >= 90 ? { text: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Excellent!' }
      : result.pct >= 70 ? { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Good Job!' }
      : result.pct >= 40 ? { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Keep Going!' }
      : { text: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Keep Practising' };
    const sc = perf;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Gradient header */}
        <div className="relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-[60px] bg-white" />
          <div className="relative z-10 text-center text-white px-6 pt-8 pb-6">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Trophy size={26} />
            </div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
              {level.title} Complete!
            </h2>
            <p className="text-white/70 text-sm mt-1">{questions.length} Questions · {CATEGORIES.length} Categories</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* Save-error warning — only shown if progress failed to persist */}
          {saveError && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
              style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
              <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
              <span className="text-yellow-800">
                Your score has been recorded locally, but we could not save your progress to the server right now.
                Please stay on this page or contact your teacher if this message persists after refreshing.
              </span>
            </div>
          )}

          {/* Score */}
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center"
            style={{ border: `1.5px solid ${sc.border}` }}>
            <p className="text-5xl font-bold" style={{ color: sc.text, fontFamily: 'Space Grotesk' }}>
              {result.pct}%
            </p>
            <p className="font-bold text-sm mt-1" style={{ color: sc.text }}>{sc.label}</p>
          </div>

          {/* Correct / Wrong / Skipped */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Correct', value: result.correct, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Wrong',   value: result.wrong,   color: '#dc2626', bg: '#fef2f2' },
              { label: 'Skipped', value: result.total - result.correct - result.wrong, color: '#64748b', bg: '#f8fafc' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm" style={{ background: s.bg }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
              Dashboard
            </button>
            <button onClick={() => navigate('/quiz-history')}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                boxShadow: `0 4px 14px ${level.color.from}40`,
              }}>
              Quiz History
            </button>
          </div>

          {/* Inline answer review */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowReview(r => !r)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" />
                <span className="font-bold text-slate-800 text-sm">Review My Answers</span>
                <span className="text-xs text-slate-400">({questions.length} questions)</span>
              </div>
              {showReview
                ? <ChevronUp size={16} className="text-slate-400" />
                : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {showReview && (
              <div className="border-t border-slate-100 p-4 space-y-3">
                {/* Color key */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 pb-1">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block"/> Correct</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"/> Wrong</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block"/> Skipped</span>
                </div>
                {questions.map((q, i) => {
                  const ans = answers[q.id] ?? answers[String(q.id)] ?? answers[Number(q.id)];
                  return (
                    <ResultQuestionCard
                      key={q.id || i}
                      q={q}
                      answer={ans}
                      index={i + 1}
                      levelColor={level.color}
                    />
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  /* ── Quiz screen ───────────────────────────────────────────────── */
  const catMeta = CATEGORY_META[q.category] || { label: q.category, color: colors.primary };
  const typeLabel = q.type === 'match' ? 'Match the Following' : q.type === 'image' ? 'Image Based' : 'Multiple Choice';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {timesUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm mx-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Time's Up!</h2>
            <p className="text-slate-500 text-sm">Submitting your quiz automatically…</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm px-4 md:px-6 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: level.color.from }} />
          <p className="font-bold text-slate-800 text-sm truncate">{level.title} — {level.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle size={12} /> Saved
            </span>
          )}
          <div className={`flex items-center gap-1.5 font-bold text-base px-3 py-1.5 rounded-xl ${timerStyle.bg} ${timerStyle.text} ${tState === 'critical' ? 'animate-pulse' : ''}`}>
            <Clock size={15} className={timerStyle.icon} />
            <span className="font-mono tabular-nums">{formatDuration(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Q {current + 1} / {questions.length}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answered / questions.length) * 100}%`,
                background: `linear-gradient(90deg, ${level.color.from}, ${level.color.to})` }} />
          </div>
          <span className="text-[11px] font-semibold shrink-0" style={{ color: level.color.from }}>
            {answered} answered
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Question card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: `${catMeta.color}15`, color: catMeta.color }}>
                    {catMeta.label}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: `${level.color.from}15`, color: level.color.from }}>
                    Q{current + 1}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {typeLabel}
                </span>
              </div>

              {/* Question image (all types) */}
              {q.imageUrl && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
                  <img src={q.imageUrl} alt="Question visual" className="w-full max-h-56 object-contain bg-slate-50" />
                </div>
              )}

              <div className="flex items-start gap-3 mb-6">
                <span className="w-8 h-8 rounded-lg text-white text-sm font-bold flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
                  {current + 1}
                </span>
                {q.text && <p className="text-slate-800 font-semibold leading-relaxed text-base">{q.text}</p>}
              </div>

              {/* Match type */}
              {q.type === 'match' && (
                <MatchQuestion
                  q={q}
                  answer={answers[q.id]}
                  onChange={val => handleAnswer(q.id, val)}
                  levelColor={level.color}
                />
              )}

              {/* MCQ / Image type */}
              {(q.type === 'mcq' || q.type === 'image' || q.type === 'tf') && Array.isArray(q.options) && (
                <div className={`grid gap-3 ${q.type === 'tf' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {q.options.map((opt, i) => {
                    const selected   = answers[q.id] === i;
                    const optText    = getOptText(opt);
                    const optImage   = getOptImage(opt);
                    const hasImage   = !!optImage;
                    return (
                      <button key={i} onClick={() => handleAnswer(q.id, i)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          selected ? 'border-transparent text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        } ${q.type === 'tf' ? 'justify-center' : ''}`}
                        style={selected ? {
                          background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                          boxShadow:  `0 4px 14px ${level.color.from}40`,
                        } : {}}>
                        {q.type !== 'tf' && (
                          <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                            selected ? 'bg-white/20 border-white/40 text-white' : 'border-slate-300 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                        )}
                        <div className={`flex items-center gap-3 flex-1 min-w-0 ${hasImage && !optText ? 'justify-center' : ''}`}>
                          {hasImage && (
                            <img src={optImage} alt={`Option ${String.fromCharCode(65+i)}`}
                              className={`object-cover rounded-lg border shrink-0 ${selected ? 'border-white/30' : 'border-slate-200'}`}
                              style={{ width: optText ? 48 : 80, height: optText ? 48 : 80 }}/>
                          )}
                          {optText && <span className={`text-sm font-semibold ${q.type === 'tf' ? 'text-base' : ''}`}>{optText}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button onClick={goBack} disabled={current === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="flex-1 text-center text-xs text-slate-400">
                {isAnswered(q, answers[q.id]) ? (
                  <span className="font-medium flex items-center justify-center gap-1" style={{ color: level.color.from }}>
                    <CheckCircle size={13} /> Answered
                  </span>
                ) : <span>Not answered yet</span>}
              </div>

              {isLast ? (
                <button onClick={() => setShowSubmit(true)} disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 14px #10B98150' }}>
                  Finish <CheckCircle size={16} />
                </button>
              ) : (
                <button onClick={goNext}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                    boxShadow: `0 4px 14px ${level.color.from}40` }}>
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="hidden md:flex flex-col w-[220px] bg-white border-l border-slate-100 p-4 shrink-0 overflow-y-auto">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Questions</p>

          <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-3">
            {[{ key:'all', label:'All' }, { key:'answered', label:'Done' }, { key:'unanswered', label:'Pending' }].map(tab => (
              <button key={tab.key} onClick={() => setPanelFilter(tab.key)}
                className="flex-1 py-1.5 text-[10px] font-bold transition-all"
                style={panelFilter === tab.key
                  ? { background: level.color.from, color: '#fff' }
                  : { background: '#f8fafc', color: '#64748b' }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => {
              const st      = getQStatus(i);
              const visible = isVisible(i);
              return (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                    !visible          ? 'opacity-20' :
                    st === 'answered' ? 'text-white' :
                    st === 'current'  ? 'text-white ring-2' :
                    'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={st === 'answered' ? { background: level.color.from }
                       : st === 'current'  ? { background: level.color.to }   : {}}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {answered}<span className="text-base text-slate-400">/{questions.length}</span>
              </p>
              <p className="text-xs text-slate-400">Answered</p>
            </div>
            <button onClick={() => setShowSubmit(true)} disabled={isSubmitting}
              className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
              {isSubmitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 shadow-lg px-4 py-2.5 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-slate-400 leading-none">Answered</p>
          <p className="text-sm font-bold text-slate-800">{answered}/{questions.length}</p>
        </div>
        <button
          onClick={() => setShowMobilePanel(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">
          <LayoutGrid size={14} /> Questions
        </button>
        <button
          onClick={() => setShowSubmit(true)} disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
          {isSubmitting ? 'Saving…' : 'Submit'}
        </button>
      </div>

      {/* Mobile questions slide-up panel */}
      {showMobilePanel && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMobilePanel(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Questions</p>
              <button onClick={() => setShowMobilePanel(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-4">
              {[{ key:'all', label:'All' }, { key:'answered', label:'Done' }, { key:'unanswered', label:'Pending' }].map(tab => (
                <button key={tab.key} onClick={() => setPanelFilter(tab.key)}
                  className="flex-1 py-2 text-xs font-bold transition-all"
                  style={panelFilter === tab.key
                    ? { background: level.color.from, color: '#fff' }
                    : { background: '#f8fafc', color: '#64748b' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2 mb-5">
              {questions.map((_, i) => {
                const st      = getQStatus(i);
                const visible = isVisible(i);
                return (
                  <button key={i}
                    onClick={() => { setCurrent(i); setShowMobilePanel(false); }}
                    className={`aspect-square rounded-xl text-sm font-bold transition-all ${
                      !visible          ? 'opacity-20' :
                      st === 'answered' ? 'text-white' :
                      st === 'current'  ? 'text-white ring-2' :
                      'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    style={st === 'answered' ? { background: level.color.from }
                         : st === 'current'  ? { background: level.color.to }   : {}}>
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold text-slate-800">
                  {answered}<span className="text-base text-slate-400">/{questions.length}</span>
                </p>
                <p className="text-xs text-slate-400">Answered</p>
              </div>
              <button
                onClick={() => { setShowMobilePanel(false); setShowSubmit(true); }}
                disabled={isSubmitting}
                className="flex-[2] text-white text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
                {isSubmitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit modal */}
      <Modal isOpen={showSubmit} onClose={() => setShowSubmit(false)} title="Submit Quiz?"
        footer={<>
          <Button variant="secondary" disabled={isSubmitting} onClick={() => { setCurrent(0); setShowSubmit(false); }}>Review Answers</Button>
          <Button variant="success" loading={isSubmitting} disabled={isSubmitting} onClick={() => doSubmit(false)} icon={<CheckCircle size={15} />}>
            {isSubmitting ? 'Submitting…' : 'Confirm Submit'}
          </Button>
        </>}>
        <div className="space-y-4">
          <div className="rounded-2xl p-4 text-center"
            style={{ background: `${level.color.from}10`, border: `1px solid ${level.color.from}25` }}>
            <p className="text-base font-bold text-slate-800">Are you sure you want to submit?</p>
            <p className="text-sm text-slate-400 mt-1">
              Time remaining: <span className={`font-semibold ${timerStyle.text}`}>{formatDuration(timeLeft)}</span>
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

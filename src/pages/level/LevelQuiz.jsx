import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Trophy, ArrowLeft, Shuffle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { LEVELS } from '../../utils/levelData';
import { formatDuration } from '../../utils/helpers';
import { generateLevelQuiz, recordUsedQuestions, saveQuizAttempt } from '../../utils/quizGenerator';
import { ensureQuestionBankSeeded, CATEGORY_META } from '../../utils/questionBank';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

function getLevelDuration(levelId) {
  try {
    const s = JSON.parse(localStorage.getItem('rqa_level_settings') || '{}');
    const mins = Number(s[levelId]?.timeLimit);
    if (mins > 0) return mins * 60;
  } catch {}
  return 600; // default 10 min
}

function timerState(t) {
  if (t <= 30)  return 'critical';
  if (t <= 120) return 'warning';
  return 'normal';
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
  const { getLevelStatus, markLevelComplete } = useLevel();
  const { colors }   = useTheme();

  const level  = LEVELS.find(l => l.id === id);
  const status = getLevelStatus(user?.uniqueId, id);

  // Redirect if locked
  useEffect(() => {
    if (status === 'locked') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  // Generate questions on mount
  const [questions, setQuestions] = useState(() => {
    ensureQuestionBankSeeded();
    return generateLevelQuiz(user?.uniqueId);
  });

  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState({});
  const [panelFilter,setPanelFilter]= useState('all');
  const [quizDuration]               = useState(() => getLevelDuration(id));
  const [timeLeft,   setTimeLeft]   = useState(() => getLevelDuration(id));
  const [timesUp,    setTimesUp]    = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [result,     setResult]     = useState(null);
  const [saved,      setSaved]      = useState(false);

  const startRef = useRef(new Date());

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
    return { correct, wrong, total, pct, timeTaken: quizDuration - timeLeft };
  }, [answers, questions, timeLeft]);

  // Countdown
  useEffect(() => {
    if (timesUp || timeLeft <= 0 || result) return;
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timesUp, timeLeft, result]);

  useEffect(() => {
    if (timeLeft <= 0 && !timesUp) setTimesUp(true);
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

  const doSubmit = (auto = false) => {
    const score = computeScore();
    markLevelComplete(user.uniqueId, id, score);

    // Record used questions
    recordUsedQuestions(user.uniqueId, questions.map(q => q.id));

    // Save full attempt for review
    saveQuizAttempt(user.uniqueId, {
      levelId: id,
      levelTitle: level?.title || `Level ${id}`,
      date: new Date().toISOString(),
      questions: questions.map(q => ({ ...q })),
      answers: { ...answers },
      score,
    });

    setResult({ ...score, auto });
    setShowSubmit(false);
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

  if (!level || !q) return null;

  /* ── Result screen ─────────────────────────────────────────────── */
  if (result) {
    const passed = result.pct >= 50;
    const sc = passed
      ? { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: result.pct >= 75 ? 'Excellent!' : 'Good Job!' }
      : { text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Keep Practising' };

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
          <div className="p-8 text-center text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-4 w-32 h-32 rounded-full bg-white blur-[50px]" />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Trophy size={30} />
              </div>
              <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                {level.title} Complete!
              </h2>
              <p className="text-white/70 text-sm mt-1">20 Questions · 4 Categories</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-2xl p-5 text-center" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
              <p className="text-5xl font-bold" style={{ color: sc.text, fontFamily: 'Space Grotesk' }}>
                {result.pct}%
              </p>
              <p className="font-bold text-sm mt-1" style={{ color: sc.text }}>{sc.label}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Correct',  value: result.correct, color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Wrong',    value: result.wrong,   color: '#dc2626', bg: '#fef2f2' },
                { label: 'Skipped',  value: result.total - result.correct - result.wrong, color: '#64748b', bg: '#f8fafc' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3" style={{ background: s.bg }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            {passed && id < 3 && (
              <div className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: `${level.color.from}10`, border: `1px solid ${level.color.from}25` }}>
                <CheckCircle size={18} style={{ color: level.color.from }} className="shrink-0" />
                <p className="text-sm font-semibold text-slate-700">Level {id + 1} is now unlocked! 🎉</p>
              </div>
            )}

            {!passed && (
              <div className="rounded-xl p-3.5 flex items-center gap-3 bg-amber-50 border border-amber-100">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <p className="text-sm font-semibold text-amber-700">Score 50% or above to unlock the next level.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => navigate('/quiz-history')}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                View Review
              </button>
              <button onClick={() => navigate('/dashboard')}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                  boxShadow: `0 6px 20px ${level.color.from}40`,
                }}>
                Dashboard
              </button>
            </div>
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
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
              {(q.type === 'mcq' || q.type === 'image' || q.type === 'tf') && q.options && (
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
                <button onClick={() => setShowSubmit(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
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
            <button onClick={() => setShowSubmit(true)}
              className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all hover:scale-[1.01]"
              style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
              Submit Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Submit modal */}
      <Modal isOpen={showSubmit} onClose={() => setShowSubmit(false)} title="Submit Quiz?"
        footer={<>
          <Button variant="secondary" onClick={() => { setCurrent(0); setShowSubmit(false); }}>Review Answers</Button>
          <Button variant="success" onClick={() => doSubmit(false)} icon={<CheckCircle size={15} />}>Confirm Submit</Button>
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

import {
  ArrowRight, Hash, ShieldAlert, CheckCircle, Trophy, Clock,
  History, BookOpen, FileText, RotateCcw, Eye, ListChecks,
  Navigation, Send, RefreshCw, Award, Wifi, AlertOctagon,
  HelpCircle, Timer, BadgeCheck, TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatUniqueId } from '../../utils/uniqueId';
import { mockQuizzes } from '../../utils/mockData';
import StatsCard from '../../components/dashboard/StatsCard';

/* ─────────────────────────────────────────────────────────────── */
/*  WelcomeBanner                                                  */
/* ─────────────────────────────────────────────────────────────── */
function WelcomeBanner({ greeting, displayId, colors, quizStatus }) {
  return (
    <div
      className="relative rounded-2xl lg:rounded-3xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${colors.accent} 0%, #0a2050 60%, #051030 100%)` }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-[100px]"
        style={{ background: colors.primary }} />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10 blur-[80px]"
        style={{ background: '#818cf8' }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5 p-6 md:p-8 lg:p-10">
        {/* Left — greeting */}
        <div className="space-y-2">
          <p className="text-white/60 text-sm font-medium tracking-wide">{greeting}!</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-white leading-tight" style={{ fontFamily: 'Space Grotesk' }}>
            Welcome, Student
          </h1>
          <p className="text-white/50 text-sm flex items-center gap-1.5 flex-wrap">
            <Hash size={13} />
            Your quiz ID:&nbsp;
            <span className="font-mono font-bold text-white/90 tracking-widest">{displayId}</span>
          </p>
        </div>

        {/* Right — status pill */}
        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}
          >
            <span className={`w-2 h-2 rounded-full ${quizStatus === 'completed' ? 'bg-green-400' : quizStatus === 'started' ? 'bg-amber-400 animate-pulse' : 'bg-blue-300'}`} />
            {quizStatus === 'completed' ? 'Quiz Completed' : quizStatus === 'started' ? 'Quiz In Progress' : 'Quiz Ready'}
          </span>
          <p className="text-white/40 text-xs">Robotics Assessment · 2025</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  QuickStats row                                                 */
/* ─────────────────────────────────────────────────────────────── */
function QuickStatsRow({ answered, completed }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      <StatsCard title="Total Questions" value="10"    subtitle="In this quiz"         icon={<HelpCircle size={20} />}  color="brand" />
      <StatsCard title="Time Limit"      value="10m"   subtitle="Auto-submits at zero" icon={<Timer size={20} />}        color="navy"  />
      <StatsCard title="Marks / Q"       value="2"     subtitle="No negative marking"  icon={<Award size={20} />}        color="green" />
      <StatsCard title="Attempts"        value="1"     subtitle="One attempt only"     icon={<BadgeCheck size={20} />}   color="amber" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Quiz Detail tiles                                              */
/* ─────────────────────────────────────────────────────────────── */
const QUIZ_DETAILS = (quizTitle) => [
  { icon: <BookOpen size={16} />,   label: 'Quiz Name',        value: quizTitle },
  { icon: <ListChecks size={16} />, label: 'Total Questions',  value: '10 Questions' },
  { icon: <Clock size={16} />,      label: 'Time Limit',       value: '10 Minutes' },
  { icon: <ListChecks size={16} />, label: 'Question Type',    value: 'MCQ / True-False' },
  { icon: <RotateCcw size={16} />,  label: 'Attempts Allowed', value: 'One Attempt Only' },
  { icon: <Navigation size={16} />, label: 'Navigation',       value: 'Free (any order)' },
  { icon: <Eye size={16} />,        label: 'Review Option',    value: 'Before submission' },
  { icon: <Send size={16} />,       label: 'Auto Submit',      value: 'When timer ends' },
  { icon: <Award size={16} />,      label: 'Marks / Question', value: '2 Marks' },
  { icon: <RefreshCw size={16} />,  label: 'Negative Marking', value: 'None' },
];

const RULES = [
  { icon: <Wifi size={14} />,        text: 'Ensure a stable internet connection throughout the quiz.' },
  { icon: <RefreshCw size={14} />,   text: 'Do not refresh or close the browser during the quiz.' },
  { icon: <CheckCircle size={14} />, text: 'Once submitted, answers cannot be changed or reviewed.' },
  { icon: <Clock size={14} />,       text: 'Complete all questions within the allotted time limit.' },
  { icon: <ShieldAlert size={14} />, text: 'Any suspicious activity may immediately end your attempt.' },
  { icon: <Eye size={14} />,         text: 'Review your answers before clicking Confirm Submit.' },
];

/* ─────────────────────────────────────────────────────────────── */
/*  AboutQuizSection                                               */
/* ─────────────────────────────────────────────────────────────── */
function AboutQuizSection({ quiz, started, colors }) {
  const details = QUIZ_DETAILS(quiz.title);

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full" style={{ background: colors.primary }} />
        <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>About the Quiz</h2>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
          style={
            started
              ? { background: '#fef9c3', color: '#92400e', border: '1px solid #fde68a' }
              : { background: `${colors.primary}15`, color: colors.primary, border: `1px solid ${colors.primary}30` }
          }
        >
          <span className={`w-1.5 h-1.5 rounded-full ${started ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
          {started ? 'In Progress' : 'Ready to Start'}
        </span>
      </div>

      {/* Details grid — 2 cols mobile / 3 cols tablet / 5 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {details.map(item => (
          <div
            key={item.label}
            className="bg-white rounded-2xl p-4 flex flex-col gap-2 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${colors.primary}12`, color: colors.primary }}
            >
              {item.icon}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5 leading-snug">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  RulesSection                                                   */
/* ─────────────────────────────────────────────────────────────── */
function RulesSection({ colors }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full" style={{ background: '#f59e0b' }} />
        <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
          Rules &amp; Regulations
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RULES.map((rule, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 flex items-start gap-3 border border-slate-100 shadow-sm"
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 mt-0.5"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
            >
              {rule.icon}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{rule.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  CTASection (Start / Continue)                                  */
/* ─────────────────────────────────────────────────────────────── */
function CTASection({ quiz, started, colors }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
        >
          <FileText size={22} />
        </div>
        <div>
          <p className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{quiz.title}</p>
          <p className="text-sm text-slate-400 mt-0.5">10 questions · 10 minutes · One attempt</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ShieldAlert size={12} className="text-amber-500" />
            <p className="text-xs text-amber-600 font-medium">One-time attempt — cannot be retaken</p>
          </div>
        </div>
      </div>

      {started ? (
        <Link
          to={`/quiz/${quiz.id}/attempt`}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 w-full sm:w-auto justify-center"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', boxShadow: '0 6px 20px #3b82f640' }}
        >
          Continue Quiz <ArrowRight size={16} />
        </Link>
      ) : (
        <Link
          to="/quizzes"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 w-full sm:w-auto justify-center"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            boxShadow: `0 6px 20px ${colors.primary}40`,
          }}
        >
          Start Quiz <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  CompletedSection                                               */
/* ─────────────────────────────────────────────────────────────── */
function CompletedSection({ quiz, result, submittedAt, sc, colors }) {
  const scoreLabel =
    (result?.pct ?? 0) >= 75 ? 'Excellent!' :
    (result?.pct ?? 0) >= 50 ? 'Good effort' : 'Keep practising';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full bg-green-500" />
        <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
          Your Result
        </h2>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
          <CheckCircle size={11} /> Completed
        </span>
      </div>

      {/* Result + meta in a 2-col grid on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Score card */}
        <div
          className="md:col-span-1 rounded-2xl p-6 flex flex-col items-center justify-center text-center border shadow-sm"
          style={{ background: sc.bg, borderColor: sc.border }}
        >
          <Trophy size={36} style={{ color: sc.text }} className="mb-3" />
          <p className="text-5xl font-bold" style={{ color: sc.text, fontFamily: 'Space Grotesk' }}>
            {result.pct ?? 0}%
          </p>
          <p className="text-sm font-bold mt-1" style={{ color: sc.text }}>{scoreLabel}</p>
          <p className="text-xs text-slate-400 mt-1">Final Score</p>
        </div>

        {/* Stat tiles */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-3">
          {[
            { label: 'Correct Answers',  value: result.correct ?? 0,                          color: 'green'  },
            { label: 'Wrong Answers',    value: result.wrong   ?? 0,                          color: 'red'    },
            { label: 'Questions Seen',   value: result.total   ? result.total / 2 : 10,       color: 'brand'  },
            { label: 'Marks Scored',     value: `${result.correct * 2 ?? 0}/${(result.total ? result.total / 2 : 10) * 2}`, color: 'navy' },
          ].map(s => (
            <StatsCard key={s.label} title={s.label} value={String(s.value)} color={s.color} />
          ))}
        </div>
      </div>

      {/* Meta + action row */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock size={14} />
            <span>Submitted on <span className="font-semibold text-slate-700">{submittedAt}</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm"
            style={{ color: '#92400e' }}>
            <TrendingUp size={14} />
            <span className="font-semibold">Attempt used — no retakes allowed</span>
          </div>
        </div>
        <Link
          to="/quiz-history"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all hover:scale-[1.02] shrink-0 w-full sm:w-auto justify-center"
        >
          <History size={14} /> View Quiz History
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const { user, hasAttemptedQuiz, isQuizStarted, getQuizResult } = useAuth();
  const { colors } = useTheme();

  const displayId = user?.uniqueId ? `#${formatUniqueId(user.uniqueId)}` : '#Student';
  const hours     = new Date().getHours();
  const greeting  = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';

  const quiz      = mockQuizzes[0];
  const completed = hasAttemptedQuiz(quiz.id);
  const started   = isQuizStarted(quiz.id);
  const result    = getQuizResult(quiz.id);

  const quizStatus = completed ? 'completed' : started ? 'started' : 'ready';

  const submittedAt = result?.completedAt
    ? new Date(result.completedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const sc =
    (result?.pct ?? 0) >= 75 ? { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' } :
    (result?.pct ?? 0) >= 50 ? { text: '#d97706', bg: '#fffbeb', border: '#fde68a' } :
                                { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' };

  return (
    <div className="min-h-full px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* 1 — Welcome banner */}
      <WelcomeBanner
        greeting={greeting}
        displayId={displayId}
        colors={colors}
        quizStatus={quizStatus}
      />

      {/* 2 — Quick stats */}
      <QuickStatsRow />

      {/* 3 — Content: completed view OR about-the-quiz + rules + CTA */}
      {completed && result ? (
        <CompletedSection
          quiz={quiz}
          result={result}
          submittedAt={submittedAt}
          sc={sc}
          colors={colors}
        />
      ) : (
        <>
          <AboutQuizSection quiz={quiz} started={started} colors={colors} />
          <RulesSection colors={colors} />
          <CTASection quiz={quiz} started={started} colors={colors} />
        </>
      )}

    </div>
  );
}

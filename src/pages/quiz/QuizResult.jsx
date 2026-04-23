import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Minus, Trophy, RotateCcw, BarChart2, Home, Share2, Star } from 'lucide-react';
import { mockQuizzes } from '../../utils/mockData';
import { formatDuration } from '../../utils/helpers';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ProgressBar from '../../components/ui/ProgressBar';
import Card, { CardHeader } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';

export default function QuizResult() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const quiz = mockQuizzes.find(q => q.id === id) || mockQuizzes[0];

  const questions = state?.questions || [];
  const answers   = state?.answers   || {};
  const timeLeft  = state?.timeLeft  ?? quiz.duration * 60;

  const correct     = questions.filter(q => answers[q.id] === q.correct).length;
  const wrong       = questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
  const unattempted = questions.length - correct - wrong;
  const marks       = correct * 2;
  const total       = questions.length * 2;
  const pct         = total > 0 ? Math.round((marks / total) * 100) : 0;
  const timeTaken   = 600 - timeLeft;

  const getGrade = () => {
    if (pct >= 90) return { label: 'Outstanding! 🌟', emoji: '🏆', color: '#FAAB34', grad: `linear-gradient(135deg, #7c5200, #FAAB34cc)` };
    if (pct >= 75) return { label: 'Excellent! 🎉',   emoji: '🥇', color: colors.success, grad: `linear-gradient(135deg, #065f46, ${colors.success}cc)` };
    if (pct >= 60) return { label: 'Good Work! 👍',   emoji: '🥈', color: colors.primary, grad: `linear-gradient(135deg, ${colors.accent}, ${colors.primary}cc)` };
    if (pct >= 40) return { label: 'Keep Going! 💪',  emoji: '📈', color: '#8B5CF6', grad: 'linear-gradient(135deg, #4c1d95, #8B5CF6cc)' };
    return            { label: 'Practice More 📚',    emoji: '💡', color: colors.error, grad: `linear-gradient(135deg, #7f1d1d, ${colors.error}cc)` };
  };
  const grade = getGrade();

  const pieData = [
    { name: 'Correct',     value: correct,     color: colors.success },
    { name: 'Wrong',       value: wrong,       color: colors.error   },
    { name: 'Unattempted', value: unattempted, color: '#e2e8f0'      },
  ].filter(d => d.value > 0);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">

      {/* ── Result hero ── */}
      <div className="rounded-3xl p-8 text-white text-center relative overflow-hidden" style={{ background: grade.grad }}>
        {/* Decorative circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-10 blur-3xl bg-white" />
        <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full opacity-15 blur-2xl bg-white" />

        <div className="relative">
          <div className="text-5xl mb-2">{grade.emoji}</div>
          <h2 className="text-xl font-semibold text-white/80 mb-1">Quiz Complete!</h2>
          <p className="text-5xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>{pct}%</p>
          <p className="text-white/80 text-sm mb-4">{marks.toFixed(1)} / {total} marks</p>
          <div
            className="inline-block font-bold text-base px-6 py-2 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            {grade.label}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: '⏱️', value: formatDuration(timeTaken), label: 'Time Taken' },
              { icon: '📊', value: `${Math.round((correct/Math.max(questions.length,1))*100)}%`, label: 'Accuracy' },
              { icon: '🏅', value: '#8',  label: 'Class Rank' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl py-3 px-2" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div className="text-xl mb-1">{s.icon}</div>
                <p className="font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
                <p className="text-white/60 text-[11px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Score breakdown cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: '✅', value: correct,      label: 'Correct',   bg: `${colors.success}15`, color: colors.success },
          { icon: '❌', value: wrong,        label: 'Wrong',     bg: `${colors.error}12`,   color: colors.error   },
          { icon: '➖', value: unattempted,  label: 'Skipped',   bg: '#f1f5f9',             color: '#94a3b8'       },
          { icon: '⭐', value: `+${correct * 2}`,  label: 'Marks Earned', bg: `${colors.primary}15`, color: colors.primary },
        ].map(s => (
          <div key={s.label}
            className="rounded-2xl p-4 text-center"
            style={{ background: s.bg }}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xl font-bold" style={{ color: s.color, fontFamily: 'Space Grotesk' }}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Score Breakdown" />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 flex-wrap">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-xs text-slate-500">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Performance" />
          <div className="space-y-3.5">
            <ProgressBar value={pct}  max={100} color="auto"  showLabel label="Overall Score" size="lg" />
            <ProgressBar value={Math.round((correct/Math.max(questions.length,1))*100)} max={100} color="green" showLabel label="Accuracy" size="md" />
            <ProgressBar value={Math.round(((quiz.duration*60-timeLeft)/(quiz.duration*60))*100)} max={100} color="brand" showLabel label="Time Utilised" size="md" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">vs Class Average</p>
              <p className="text-sm font-bold text-slate-700 mt-0.5">You scored <span className="text-green-600">+{Math.max(0, pct-68)}%</span> above average</p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
        </Card>
      </div>

      {/* ── Detailed review ── */}
      <Card>
        <CardHeader title="Question Review" subtitle="Detailed answer breakdown" />
        <div className="space-y-3">
          {questions.map((q, i) => {
            const userAns  = answers[q.id];
            const isCorrect = userAns === q.correct;
            const isSkipped = userAns === undefined;
            return (
              <div key={q.id}
                className="rounded-2xl p-4 border"
                style={
                  isCorrect ? { background: `${colors.success}08`, borderColor: `${colors.success}25` } :
                  isSkipped ? { background: '#f8fafc', borderColor: '#e2e8f0' } :
                  { background: `${colors.error}08`, borderColor: `${colors.error}22` }
                }>
                <div className="flex items-start gap-2.5 mb-2">
                  <span className="text-base shrink-0 mt-0.5">
                    {isCorrect ? '✅' : isSkipped ? '⏭️' : '❌'}
                  </span>
                  <p className="text-sm font-semibold text-slate-800">Q{i+1}. {q.text}</p>
                </div>
                <div className="pl-8 space-y-1">
                  {userAns !== undefined && (
                    <p className="text-xs">
                      Your answer: <span className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>{q.options[userAns]}</span>
                    </p>
                  )}
                  {!isCorrect && (
                    <p className="text-xs">
                      Correct answer: <span className="font-bold text-green-600">{q.options[q.correct]}</span>
                    </p>
                  )}
                  {isSkipped && <p className="text-xs text-slate-400">Not attempted — 0 marks</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3">
        <Link to="/"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors">
          <Home size={15} /> Dashboard
        </Link>
        <Link to="/quiz-history"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors">
          <BarChart2 size={15} /> My History
        </Link>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
          style={{ borderColor: `${colors.primary}40`, color: colors.primary, background: `${colors.primary}08` }}>
          <Share2 size={15} /> Share Result
        </button>

      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, HelpCircle, AlertTriangle, ChevronRight, ArrowLeft, BookOpen, CheckCircle } from 'lucide-react';
import { mockQuizzes } from '../../utils/mockData';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

export default function QuizInstructions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { user, hasAttemptedQuiz } = useAuth();
  const quiz = mockQuizzes.find(q => q.id === id) || mockQuizzes[0];
  const isStudent = user?.role === ROLES.STUDENT;
  const attempted = isStudent && hasAttemptedQuiz(id);

  const rules = [
    'Read each question carefully before answering.',
    'You can navigate between questions using the question panel.',
    'Questions are auto-saved as you answer.',
    'The timer counts down from the total duration.',
    'You can review and change answers before final submission.',
    'Once submitted, answers cannot be changed.',
    'Negative marking applies: -0.5 marks per wrong answer.',
    'Do not refresh or close the browser during the quiz.',
  ];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> Back to quizzes
      </button>

      {/* Header */}
      <div
        className="rounded-2xl p-6 mb-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)` }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-2xl"
          style={{ background: colors.secondary, transform: 'translate(30%, -30%)' }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mb-3"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              {quiz.topic}
            </span>
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>{quiz.title}</h1>
            <p className="text-white/70 text-sm">Assess your robotics knowledge</p>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <BookOpen size={26} />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 relative">
          {[
            { icon: <Clock size={16} />, label: 'Duration', value: `${quiz.duration} min` },
            { icon: <HelpCircle size={16} />, label: 'Questions', value: quiz.questions },
            { icon: <BookOpen size={16} />, label: 'Total Marks', value: quiz.marks },
            { icon: <AlertTriangle size={16} />, label: 'Difficulty', value: quiz.difficulty },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center gap-1.5 text-white/70 mb-1">
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </div>
              <p className="font-bold capitalize">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-yellow-500" /> Instructions
        </h2>
        <ul className="space-y-2.5">
          {rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
              <span
                className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: colors.primary }}
              >
                {i + 1}
              </span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Marking scheme */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Correct Answer', value: '+2 marks', bg: `${colors.success}18`, border: `${colors.success}30`, text: colors.success },
          { label: 'Wrong Answer',   value: '-0.5 marks', bg: `${colors.error}15`,  border: `${colors.error}30`,  text: colors.error   },
          { label: 'Not Attempted',  value: '0 marks',    bg: '#f8fafc',            border: '#e2e8f0',             text: '#64748b'      },
        ].map(item => (
          <div
            key={item.label}
            className="rounded-xl p-4 text-center border"
            style={{ background: item.bg, borderColor: item.border }}
          >
            <p className="text-xs font-medium mb-1 opacity-70" style={{ color: item.text }}>{item.label}</p>
            <p className="text-xl font-bold" style={{ color: item.text }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
        {attempted ? (
          <div
            className="flex-1 flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm"
            style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
          >
            <CheckCircle size={16} /> Already Completed — One attempt allowed
          </div>
        ) : (
          <button
            onClick={() => navigate(`/quiz/${id}/attempt`)}
            className="flex-1 flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl transition-all"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
              boxShadow: `0 8px 24px ${colors.primary}44`,
            }}
          >
            Start Quiz <ChevronRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

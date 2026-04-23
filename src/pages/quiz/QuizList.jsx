import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockQuizzes } from '../../utils/mockData';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import { useTheme } from '../../context/ThemeContext';
import { Bot } from 'lucide-react';

export default function QuizList() {
  const navigate = useNavigate();
  const { user, hasAttemptedQuiz } = useAuth();
  const { colors } = useTheme();
  const isStudent = user?.role === ROLES.STUDENT;

  useEffect(() => {
    if (isStudent) {
      const next = mockQuizzes.find(q => !hasAttemptedQuiz(q.id));
      if (next) {
        navigate(`/quiz/${next.id}/attempt`, { replace: true });
      }
    }
  }, [isStudent, navigate, hasAttemptedQuiz]);

  // Non-students or all quizzes completed
  if (isStudent) {
    const allDone = mockQuizzes.every(q => hasAttemptedQuiz(q.id));
    if (allDone) {
      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
          <Bot size={56} className="mb-4" style={{ color: colors.primary }} />
          <p className="text-xl font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>
            All quizzes completed!
          </p>
          <p className="text-slate-400 text-sm mt-1">Check your results in Quiz History.</p>
        </div>
      );
    }
    return null;
  }

  // Non-student: simple quiz list for management
  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Quizzes</h1>
      <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {mockQuizzes.map(q => (
          <div key={q.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-semibold text-slate-800 text-sm">{q.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{q.topic}</p>
            </div>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
              style={{
                background: q.status === 'active' ? '#dcfce7' : '#f1f5f9',
                color:      q.status === 'active' ? '#16a34a' : '#64748b',
              }}
            >
              {q.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

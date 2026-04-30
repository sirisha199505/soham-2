import { ChevronRight } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import { mockActivity } from '../../utils/mockData';
import { useTheme } from '../../context/ThemeContext';

const ACTIVITY_STYLES = {
  quiz_completed: { bg: '#10B98118', color: '#059669', emoji: '✅' },
  quiz_assigned:  { bg: '#3BC0EF18', color: '#1589b5', emoji: '📋' },
  leaderboard:    { bg: '#FAAB3418', color: '#b97308', emoji: '🏆' },
  quiz_attempted: { bg: '#8B5CF618', color: '#7c3aed', emoji: '▶️' },
};

export default function RecentActivity() {
  const { colors } = useTheme();

  return (
    <Card>
      <CardHeader
        title="Recent Activity"
        subtitle="Your latest interactions"
        action={
          <button className="text-xs font-semibold hover:underline" style={{ color: colors.primary }}>
            View all
          </button>
        }
      />
      <div className="space-y-1">
        {mockActivity.map((item) => {
          const style = ACTIVITY_STYLES[item.type] || ACTIVITY_STYLES.quiz_assigned;
          return (
            <div key={item.id} className="flex items-start gap-3 py-2.5 px-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5"
                style={{ background: style.bg }}
              >
                {style.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 leading-snug font-medium">{item.text}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.score && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: '#10B98118', color: '#059669' }}>
                      {item.score}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{item.time}</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

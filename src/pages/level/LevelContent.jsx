import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { LEVELS, LEVEL1_PAGES, LEVEL2_PAGES, LEVEL3_PAGES } from '../../utils/levelData';

const STATIC_CONTENT = { 1: LEVEL1_PAGES, 2: LEVEL2_PAGES, 3: LEVEL3_PAGES };
const CONTENT_KEY = 'rqa_custom_content';

function getLevelPages(id) {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTENT_KEY) || '{}');
    return saved[id] || STATIC_CONTENT[id] || [];
  } catch {
    return STATIC_CONTENT[id] || [];
  }
}

export default function LevelContent() {
  const { levelId }  = useParams();
  const id           = Number(levelId);
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { markContentRead } = useLevel();
  const { colors }   = useTheme();

  const level   = LEVELS.find(l => l.id === id);
  const pages   = getLevelPages(id);
  const total   = pages.length;

  const [pageIndex, setPageIndex] = useState(0);
  const [read,      setRead]      = useState(new Set());

  const current = pages[pageIndex];
  const isLast  = pageIndex === total - 1;
  const allRead = read.size === total;

  useEffect(() => {
    if (level && total === 0) navigate(`/level/${id}/quiz`, { replace: true });
  }, []);

  const markRead = () => setRead(prev => new Set([...prev, pageIndex]));

  const handleNext = () => {
    markRead();
    if (!isLast) { setPageIndex(p => p + 1); window.scrollTo(0, 0); }
  };

  const handleStartQuiz = () => {
    markRead();
    markContentRead(user.uniqueId, id);
    navigate(`/level/${id}/quiz`);
  };

  if (!level || total === 0 || !current) return null;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors shrink-0"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400 font-medium truncate">
              {level.title} — {level.subtitle}
            </p>
            <p className="text-sm font-bold text-slate-800 truncate">{current.title}</p>
          </div>

          {/* Page pill */}
          <span
            className="text-xs font-bold px-3 py-1 rounded-full shrink-0"
            style={{ background: `${colors.primary}15`, color: colors.primary }}
          >
            Page {pageIndex + 1} of {total}
          </span>
        </div>

        {/* Page progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 transition-all duration-500"
            style={{
              width: `${((pageIndex + (read.has(pageIndex) ? 1 : 0)) / total) * 100}%`,
              background: `linear-gradient(90deg, ${level.color.from}, ${level.color.to})`,
            }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Page header card */}
        <div
          className="rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-[60px] bg-white" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <BookOpen size={22} />
            </div>
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">
                {level.title} · Page {pageIndex + 1} of {total}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                {current.title}
              </h1>
              <p className="text-white/60 text-sm mt-2 flex items-center gap-1.5">
                <Clock size={13} /> ~5 min read
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        {current.sections.map((sec, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-3">
            <h2
              className="text-lg font-bold text-slate-800 flex items-center gap-2"
              style={{ fontFamily: 'Space Grotesk' }}
            >
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}
              >
                {i + 1}
              </span>
              {sec.heading}
            </h2>
            <div className="border-t border-slate-100 pt-3">
              {sec.body.split('\n').map((line, li) => {
                if (!line.trim()) return <div key={li} className="h-2" />;
                // Bold markdown-style **text**
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <p key={li} className="text-slate-600 leading-relaxed text-sm md:text-base mb-1">
                    {parts.map((part, pi) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={pi} className="text-slate-800 font-semibold">{part.slice(2, -2)}</strong>
                        : part
                    )}
                  </p>
                );
              })}
            </div>
          </div>
        ))}

        {/* Page dot indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {pages.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width:  i === pageIndex ? 24 : 8,
                height: 8,
                background: read.has(i)
                  ? level.color.from
                  : i === pageIndex
                    ? `${level.color.from}80`
                    : '#e2e8f0',
              }}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pb-8">
          <button
            onClick={() => { setPageIndex(p => p - 1); window.scrollTo(0, 0); }}
            disabled={pageIndex === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          {isLast ? (
            <button
              onClick={handleStartQuiz}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                boxShadow: `0 6px 20px ${level.color.from}50`,
              }}
            >
              <CheckCircle size={16} /> Done Reading — Start Quiz
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                boxShadow: `0 6px 20px ${level.color.from}50`,
              }}
            >
              Next Page <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

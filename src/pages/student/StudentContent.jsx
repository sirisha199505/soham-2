import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, FileText,
  ExternalLink, Download, Loader2,
} from 'lucide-react';
import { scrollToTop } from '../../utils/scroll';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { LEVELS } from '../../utils/levelData';
import { api } from '../../utils/api';

const FALLBACK_COLORS = [
  { from: '#3BC0EF', to: '#1E3A8A' },
  { from: '#8B5CF6', to: '#6d28d9' },
  { from: '#10B981', to: '#047857' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#B91C1C' },
  { from: '#EC4899', to: '#BE185D' },
];

export default function StudentContent() {
  const { user }   = useAuth();
  const { levelSettings, levelSettingsLoaded } = useLevel();

  const sortedLevels = Object.values(levelSettings)
    .sort((a, b) => (a.order || a.id) - (b.order || b.id))
    .map((dbLevel, idx) => {
      const staticLevel = LEVELS.find(l => l.id === dbLevel.id);
      if (staticLevel) return staticLevel;
      return {
        id:       dbLevel.id,
        title:    dbLevel.title    || `Level ${dbLevel.id}`,
        subtitle: dbLevel.subtitle || '',
        color:    FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      };
    });

  const [allContent,    setAllContent]    = useState({});
  const [loading,       setLoading]       = useState(true);
  const [activeLevelId, setActiveLevelId] = useState(null);
  const [pageIndex,     setPageIndex]     = useState(0);

  useEffect(() => {
    if (sortedLevels.length > 0 && activeLevelId === null) {
      setActiveLevelId(sortedLevels[0].id);
    }
  }, [sortedLevels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.id || !levelSettingsLoaded) return;
    if (sortedLevels.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(sortedLevels.map(l => api.getContent(l.id)))
      .then(results => {
        const map = {};
        sortedLevels.forEach((l, i) => { map[l.id] = results[i] || []; });
        setAllContent(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, levelSettingsLoaded, sortedLevels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveId = activeLevelId ?? sortedLevels[0]?.id;
  const pages   = allContent[effectiveId] || [];
  const total   = pages.length;
  const current = pages[pageIndex];
  const level   = sortedLevels.find(l => l.id === effectiveId) || sortedLevels[0];

  const handleLevelChange = (id) => {
    setActiveLevelId(id);
    setPageIndex(0);
    scrollToTop();
  };

  const handleNext = () => {
    if (pageIndex < total - 1) { setPageIndex(p => p + 1); scrollToTop(); }
  };

  const handlePrev = () => {
    if (pageIndex > 0) { setPageIndex(p => p - 1); scrollToTop(); }
  };

  const pdfBlobUrl = useMemo(() => {
    if (!current?.pdfData || current.type !== 'pdf') return null;
    try {
      const arr  = current.pdfData.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      const u8   = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      return URL.createObjectURL(new Blob([u8], { type: mime }));
    } catch { return current.pdfData; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.pdfData, pageIndex, effectiveId]);

  useEffect(() => {
    return () => { if (pdfBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || !levelSettingsLoaded) {
    return (
      <div className="min-h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading content…</p>
        </div>
      </div>
    );
  }

  if (sortedLevels.length === 0) {
    return (
      <div className="min-h-full bg-slate-50 px-4 md:px-8 py-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-24 text-center">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">No levels available yet</p>
          <p className="text-slate-400 text-sm mt-1">Check back after your administrator configures exam levels.</p>
        </div>
      </div>
    );
  }

  const gradientStyle = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : {};

  const btnBase = 'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="min-h-full bg-slate-50">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-8 py-5">
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
          Study Content
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Browse all level materials before attempting quizzes</p>

        {/* Level tabs */}
        <div className="flex gap-2 flex-wrap mt-4">
          {sortedLevels.map(l => {
            const isActive  = l.id === effectiveId;
            const pageCount = (allContent[l.id] || []).length;
            return (
              <button
                key={l.id}
                onClick={() => handleLevelChange(l.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.02]"
                style={isActive ? {
                  background: `linear-gradient(135deg, ${l.color.from}, ${l.color.to})`,
                  color: '#fff',
                  border: 'none',
                  boxShadow: `0 4px 14px ${l.color.from}40`,
                } : {
                  background: '#f8fafc',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                }}
              >
                <BookOpen size={13} />
                {l.title}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={isActive
                    ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                    : { background: '#e2e8f0', color: '#94a3b8' }}
                >
                  {pageCount}p
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content area ────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 py-6 space-y-5 max-w-5xl mx-auto">

        {total === 0 || !current || !level ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-24 text-center">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-medium">No content yet for this level</p>
            <p className="text-slate-400 text-sm mt-1">Check back after your teacher adds study material.</p>
          </div>
        ) : (
          <>
            {/* Progress strip */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3.5 flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500 shrink-0">
                Page {pageIndex + 1} / {total}
              </span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${((pageIndex + 1) / total) * 100}%`,
                    ...gradientStyle,
                  }}
                />
              </div>
              {/* Dot indicators */}
              <div className="flex gap-1.5 shrink-0">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setPageIndex(i); scrollToTop(); }}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width:      i === pageIndex ? 18 : 6,
                      height:     6,
                      background: i === pageIndex ? level.color.from : '#e2e8f0',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Page title banner */}
            <div
              className="rounded-2xl p-5 text-white relative overflow-hidden"
              style={gradientStyle}
            >
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-3xl bg-white pointer-events-none" />
              <div className="relative z-10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  {current.type === 'pdf' ? <FileText size={18} /> : <BookOpen size={18} />}
                </div>
                <div>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                    {level.title}{level.subtitle ? ` · ${level.subtitle}` : ''}
                  </p>
                  <h2 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Space Grotesk' }}>
                    {current.title || current.pdfName || 'Study Material'}
                  </h2>
                </div>
              </div>
            </div>

            {/* ── PDF viewer ──────────────────────────────────────── */}
            {current.type === 'pdf' && pdfBlobUrl ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={gradientStyle}
                    >
                      <FileText size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{current.pdfName || 'Study Material'}</p>
                      <p className="text-[11px] text-slate-400">PDF document</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={pdfBlobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink size={12} /> Open
                    </a>
                    <a
                      href={pdfBlobUrl}
                      download={current.pdfName || 'study-material.pdf'}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-white transition-colors"
                      style={gradientStyle}
                    >
                      <Download size={12} /> Download
                    </a>
                  </div>
                </div>
                {/* PDF frame */}
                <iframe
                  key={`${effectiveId}-${pageIndex}`}
                  src={pdfBlobUrl}
                  title={current.pdfName || 'Study Material'}
                  className="w-full block border-0"
                  style={{ height: '78vh', minHeight: 480 }}
                />
              </div>
            ) : (
              /* ── Text sections ──────────────────────────────────── */
              <div className="space-y-4">
                {(current.sections || []).map((sec, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Section heading */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={gradientStyle}
                      >
                        {i + 1}
                      </span>
                      <h3 className="text-base font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
                        {sec.heading}
                      </h3>
                    </div>
                    {/* Section body */}
                    <div className="px-5 py-4 space-y-1.5">
                      {(sec.body || '').split('\n').map((line, li) => {
                        if (!line.trim()) return <div key={li} className="h-1.5" />;
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        return (
                          <p key={li} className="text-slate-600 leading-relaxed text-sm">
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
              </div>
            )}

            {/* ── Navigation ──────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 pb-6">
              <button
                onClick={handlePrev}
                disabled={pageIndex === 0}
                className={`${btnBase} text-white hover:scale-[1.02] active:scale-[0.98]`}
                style={{
                  ...gradientStyle,
                  boxShadow: pageIndex > 0 ? `0 4px 14px ${level.color.from}40` : 'none',
                  opacity: pageIndex === 0 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <span className="text-xs font-semibold text-slate-400">
                {pageIndex + 1} / {total}
              </span>

              <button
                onClick={handleNext}
                disabled={pageIndex === total - 1}
                className={`${btnBase} text-white hover:scale-[1.02] active:scale-[0.98]`}
                style={{
                  ...gradientStyle,
                  boxShadow: pageIndex < total - 1 ? `0 4px 14px ${level.color.from}40` : 'none',
                  opacity: pageIndex === total - 1 ? 0.4 : 1,
                }}
              >
                Next Page <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

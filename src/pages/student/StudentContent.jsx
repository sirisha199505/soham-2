import { useState, useEffect } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, FileText,
  ExternalLink, Clock, Download, Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLevel } from '../../context/LevelContext';
import { LEVELS } from '../../utils/levelData';
import { api } from '../../utils/api';
import { downloadLevelContentAsPDF } from '../../utils/pdfExport';

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
  const { colors } = useTheme();
  const { levelSettings, levelSettingsLoaded } = useLevel();

  // Build sorted level list from DB-driven levelSettings
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
  const [pdfOpened,     setPdfOpened]     = useState(false);

  // Set the first level as active once settings are loaded
  useEffect(() => {
    if (sortedLevels.length > 0 && activeLevelId === null) {
      setActiveLevelId(sortedLevels[0].id);
    }
  }, [sortedLevels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content for all levels once levelSettings is ready
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
    setPdfOpened(false);
  };

  const handleNext = () => {
    if (pageIndex < total - 1) { setPageIndex(p => p + 1); window.scrollTo(0, 0); }
  };

  const handlePrev = () => {
    if (pageIndex > 0) { setPageIndex(p => p - 1); window.scrollTo(0, 0); }
  };

  const openPdf = (dataUrl) => {
    try {
      const arr  = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      const u8   = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      const url  = URL.createObjectURL(new Blob([u8], { type: mime }));
      window.open(url, '_blank');
      setPdfOpened(true);
    } catch { window.open(dataUrl, '_blank'); }
  };

  // Show loading until both levelSettings and content are ready
  if (loading || !levelSettingsLoaded) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading content…</p>
        </div>
      </div>
    );
  }

  // No levels configured at all
  if (sortedLevels.length === 0) {
    return (
      <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 text-sm font-medium">No levels available yet</p>
          <p className="text-slate-400 text-xs mt-1">Check back after your administrator configures exam levels.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Study Content
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Browse all level materials before attempting quizzes</p>
        </div>
        {total > 0 && level && (
          <button
            onClick={() => downloadLevelContentAsPDF(pages, level.title)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ borderColor: `${colors.primary}40`, color: colors.primary, background: `${colors.primary}08` }}
          >
            <Download size={15} /> Download PDF
          </button>
        )}
      </div>

      {/* Level tabs */}
      <div className="flex gap-2 flex-wrap">
        {sortedLevels.map(l => {
          const isActive  = l.id === effectiveId;
          const pageCount = (allContent[l.id] || []).length;
          return (
            <button
              key={l.id}
              onClick={() => handleLevelChange(l.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
              style={isActive ? {
                background: `linear-gradient(135deg, ${l.color.from}, ${l.color.to})`,
                color: '#fff', border: 'none',
                boxShadow: `0 4px 14px ${l.color.from}40`,
              } : {
                background: '#fff', color: '#64748b', border: '1px solid #e2e8f0',
              }}
            >
              <BookOpen size={14} />
              {l.title}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={isActive
                  ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                  : { background: '#f1f5f9', color: '#94a3b8' }}
              >
                {`${pageCount}p`}
              </span>
            </button>
          );
        })}
      </div>

      {total === 0 || !current || !level ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-500 text-sm font-medium">No content yet for this level</p>
          <p className="text-slate-400 text-xs mt-1">Check back after your teacher adds study material.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 shrink-0">
              Page {pageIndex + 1} of {total}
            </span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${((pageIndex + 1) / total) * 100}%`,
                  background: `linear-gradient(90deg, ${level.color.from}, ${level.color.to})`,
                }}
              />
            </div>
            <div className="flex gap-1 shrink-0">
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setPageIndex(i); setPdfOpened(false); }}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: i === pageIndex ? 20 : 7, height: 7,
                    background: i === pageIndex ? level.color.from : '#e2e8f0',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Page header */}
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-[60px] bg-white" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen size={20} />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold mb-1">
                  {level.title}{level.subtitle ? ` · ${level.subtitle}` : ''}
                </p>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
                  {current.title}
                </h2>
                <p className="text-white/60 text-xs mt-1.5 flex items-center gap-1">
                  <Clock size={11} /> ~5 min read
                </p>
              </div>
            </div>
          </div>

          {/* PDF content */}
          {current.type === 'pdf' && current.pdfData ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
                    <FileText size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{current.pdfName || 'Study Material'}</p>
                    <p className="text-xs text-slate-400">PDF document</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openPdf(current.pdfData)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink size={12} /> Open
                  </button>
                  <a
                    href={current.pdfData}
                    download={current.pdfName || 'study-material.pdf'}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <Download size={12} /> Download
                  </a>
                </div>
              </div>
              <embed
                src={current.pdfData}
                type="application/pdf"
                className="w-full block"
                style={{ height: '65vh' }}
                onLoad={() => setPdfOpened(true)}
              />
            </div>
          ) : (
            /* Text sections */
            <div className="space-y-4">
              {(current.sections || []).map((sec, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
                  <h3
                    className="text-base font-bold text-slate-800 flex items-center gap-2"
                    style={{ fontFamily: 'Space Grotesk' }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}
                    >
                      {i + 1}
                    </span>
                    {sec.heading}
                  </h3>
                  <div className="border-t border-slate-100 pt-3">
                    {(sec.body || '').split('\n').map((line, li) => {
                      if (!line.trim()) return <div key={li} className="h-2" />;
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={li} className="text-slate-600 leading-relaxed text-sm mb-1">
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

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 pb-4">
            <button
              onClick={handlePrev}
              disabled={pageIndex === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              onClick={handleNext}
              disabled={pageIndex === total - 1}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                boxShadow: pageIndex < total - 1 ? `0 4px 14px ${level.color.from}40` : 'none',
              }}
            >
              Next Page <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

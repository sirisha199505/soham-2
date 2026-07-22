import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scrollToTop } from '../../utils/scroll';
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle, ArrowRight, Clock, FileText, ExternalLink, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { LEVELS } from '../../utils/levelData';
import { downloadLevelContentAsPDF } from '../../utils/pdfExport';
import { api } from '../../utils/api';
import { youtubeEmbedUrl } from '../../utils/helpers';
import DOMPurify from 'dompurify';

export default function LevelContent() {
  const { levelId }  = useParams();
  const id           = Number(levelId);
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { markContentRead, levelSettings, levelSettingsLoaded } = useLevel();
  const { colors }   = useTheme();

  const staticLevel = LEVELS.find(l => l.id === id);
  const dbLevel     = levelSettings[id];

  // Build display object: static LEVELS data takes priority; fall back to DB settings
  // for admin-created levels that don't have a hardcoded entry in LEVELS.
  const FALLBACK_COLORS = [
    { from: '#f59e0b', to: '#d97706' },
    { from: '#ec4899', to: '#db2777' },
    { from: '#14b8a6', to: '#0d9488' },
    { from: '#6366f1', to: '#4f46e5' },
  ];
  const fallbackColor = FALLBACK_COLORS[(id - 1) % FALLBACK_COLORS.length];
  const level = staticLevel ?? (dbLevel ? {
    id,
    title:    dbLevel.title    || `Level ${id}`,
    subtitle: dbLevel.subtitle || '',
    color:    fallbackColor,
  } : null);

  const [pages,   setPages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const total = pages.length;

  // Redirect to dashboard only if the level has been deleted from DB (not just missing from LEVELS)
  useEffect(() => {
    if (levelSettingsLoaded && !dbLevel) navigate('/dashboard', { replace: true });
  }, [levelSettingsLoaded, dbLevel, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.getContent(id)
      .then(dbPages => setPages(Array.isArray(dbPages) ? dbPages : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const [pageIndex, setPageIndex] = useState(0);
  const [read,      setRead]      = useState(new Set());

  // Convert the current page's PDF base64 data to a Blob URL so browsers
  // render it inline instead of triggering a download dialog.
  const pdfBlobUrl = useMemo(() => {
    const pdfData = pages[pageIndex]?.pdfData;
    if (!pdfData || pages[pageIndex]?.type !== 'pdf') return null;
    try {
      const arr  = pdfData.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      const u8   = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
      return URL.createObjectURL(new Blob([u8], { type: mime }));
    } catch { return pdfData; }
  }, [pageIndex, pages]);

  // Revoke the old blob URL when navigating away to avoid memory leaks
  useEffect(() => {
    return () => { if (pdfBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  const current = pages[pageIndex];
  const isLast  = pageIndex === total - 1;

  const markRead = () => setRead(prev => new Set([...prev, pageIndex]));

  const handleNext = () => {
    markRead();
    if (!isLast) { setPageIndex(p => p + 1); scrollToTop(); }
  };

  const handleStartQuiz = () => {
    markRead();
    markContentRead(user.id, id);
    navigate(`/level/${id}/quiz`);
  };

  // While level settings are still loading, show the same spinner rather than a blank page
  if (!level) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading content…</p>
        </div>
      </div>
    );
  }

  if (total === 0 || !current) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center max-w-sm">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-700 font-semibold text-base mb-1">No content available yet</p>
          <p className="text-slate-400 text-sm mb-5">Your teacher hasn't added study material for this level yet. Check back soon.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={15} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

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

          {/* Download button */}
          <button
            onClick={() => downloadLevelContentAsPDF(pages, level.title)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors shrink-0"
            style={{ borderColor: `${level.color.from}40`, color: level.color.from, background: `${level.color.from}08` }}
            title="Download all content as PDF"
          >
            <Download size={12} /> PDF
          </button>
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

        {/* Video content — embedded player + open-in-new-tab link */}
        {current.type === 'video' ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {youtubeEmbedUrl(current.pdfData) ? (
              <div className="bg-black aspect-video">
                <iframe src={youtubeEmbedUrl(current.pdfData)} title={current.title || 'Video'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              </div>
            ) : (
              <div className="p-8 text-center">
                <ExternalLink size={28} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">This video opens on an external site.</p>
              </div>
            )}
            {current.pdfData && (
              <div className="px-5 py-4 border-t border-slate-100">
                <a href={current.pdfData} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white transition-colors"
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
                  <ExternalLink size={14} /> Open video in new tab
                </a>
              </div>
            )}
          </div>
        ) : current.type === 'pdf' && pdfBlobUrl ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* PDF toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}
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
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}
                >
                  <Download size={12} /> Download
                </a>
              </div>
            </div>
            {/* key=pageIndex forces the iframe to remount on page change, preventing stale PDF */}
            <iframe
              key={pageIndex}
              src={pdfBlobUrl}
              title={current.pdfName || 'Study Material'}
              className="w-full block border-0"
              style={{ height: '78vh', minHeight: 480 }}
            />
          </div>
        ) : (
          /* Text sections */
          (current.sections || []).map((sec, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}
                >
                  {i + 1}
                </span>
                <h2 className="text-base font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
                  {sec.heading}
                </h2>
              </div>
              <div className="px-5 py-4 rich-content text-sm md:text-base text-slate-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sec.body || '') }} />
            </div>
          ))
        )}

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
            onClick={() => { setPageIndex(p => p - 1); scrollToTop(); }}
            disabled={pageIndex === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
              boxShadow: pageIndex > 0 ? `0 6px 20px ${level.color.from}50` : 'none',
              opacity: pageIndex === 0 ? 0.4 : 1,
            }}
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

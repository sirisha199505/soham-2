import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen, FileText, Clock, ChevronLeft, ChevronRight,
  Download, ExternalLink, Play, Layers, X, CheckCircle,
  Loader2, Eye, BookMarked,
} from 'lucide-react';
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

// ── Helpers ────────────────────────────────────────────────────────────────
function estimateReadTime(page) {
  if (page.type === 'pdf') return `${Math.max(2, (page.pageCount || 1) * 2)} min`;
  const words = (page.sections || []).reduce((s, sec) => s + (sec.body || '').split(/\s+/).length, 0);
  return `${Math.max(1, Math.round(words / 200))} min`;
}

function getSectionCount(page) {
  if (page.type === 'pdf') return `${page.pageCount || '?'} pages`;
  return `${(page.sections || []).length} section${(page.sections || []).length !== 1 ? 's' : ''}`;
}

function buildBlobUrl(pdfData) {
  if (!pdfData) return null;
  if (pdfData.startsWith('blob:') || pdfData.startsWith('http')) return pdfData;
  try {
    const arr  = pdfData.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const u8   = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return URL.createObjectURL(new Blob([u8], { type: mime }));
  } catch { return pdfData; }
}

// ── Read progress stored in localStorage ──────────────────────────────────
function markRead(levelId, pageIdx) {
  try {
    const key  = `content_read_${levelId}`;
    const read = JSON.parse(localStorage.getItem(key) || '[]');
    if (!read.includes(pageIdx)) {
      localStorage.setItem(key, JSON.stringify([...read, pageIdx]));
    }
    localStorage.setItem(`content_last_${levelId}`, String(pageIdx));
    localStorage.setItem(`content_last_time_${levelId}`, Date.now().toString());
  } catch {}
}

function getReadPages(levelId) {
  try { return JSON.parse(localStorage.getItem(`content_read_${levelId}`) || '[]'); } catch { return []; }
}

function getLastRead(levelId) {
  try {
    const idx  = localStorage.getItem(`content_last_${levelId}`);
    const time = localStorage.getItem(`content_last_time_${levelId}`);
    if (!idx || !time) return null;
    return { idx: Number(idx), time: Number(time) };
  } catch { return null; }
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Content Reader Modal ───────────────────────────────────────────────────
function ReaderModal({ page, level, onClose }) {
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (page.type === 'pdf' && page.pdfData) {
      const url = buildBlobUrl(page.pdfData);
      setPdfUrl(url);
      return () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
    }
  }, [page]);

  // Lock scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const gradStyle = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : {};

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal container */}
      <div className="relative z-10 flex flex-col m-auto w-full max-w-4xl max-h-[95vh] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff' }}>

        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0"
          style={{ background: 'linear-gradient(to right, #f8fafc, #fff)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
            style={gradStyle}>
            {page.type === 'pdf' ? <FileText size={16} /> : <BookOpen size={16} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {page.title || page.pdfName || 'Study Material'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">
              {level?.title} · {page.type === 'pdf' ? 'PDF Document' : `${(page.sections || []).length} sections`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {page.type === 'pdf' && pdfUrl && (
              <>
                <a href={pdfUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  <ExternalLink size={12} /> Open
                </a>
                <a href={pdfUrl} download={page.pdfName || 'material.pdf'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={gradStyle}>
                  <Download size={12} /> Download
                </a>
              </>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <X size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto">
          {page.type === 'pdf' ? (
            pdfUrl ? (
              <iframe
                src={pdfUrl}
                title={page.pdfName || 'Material'}
                className="w-full border-0"
                style={{ height: 'calc(95vh - 80px)', minHeight: 480 }}
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
              </div>
            )
          ) : (
            <div className="p-5 space-y-4">
              {(page.sections || []).map((sec, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50"
                    style={{ background: '#f8fafc' }}>
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={gradStyle}>{i + 1}</span>
                    <h3 className="text-sm font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
                      {sec.heading}
                    </h3>
                  </div>
                  <div className="px-5 py-4 space-y-2">
                    {(sec.body || '').split('\n').map((line, li) => {
                      if (!line.trim()) return <div key={li} className="h-1" />;
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={li} className="text-sm text-slate-600 leading-relaxed">
                          {parts.map((p, pi) =>
                            p.startsWith('**') && p.endsWith('**')
                              ? <strong key={pi} className="text-slate-800 font-semibold">{p.slice(2, -2)}</strong>
                              : p
                          )}
                        </p>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Material Card ──────────────────────────────────────────────────────────
function MaterialCard({ page, index, levelId, level, onRead }) {
  const [readPages] = useState(() => getReadPages(levelId));
  const [lastRead]  = useState(() => getLastRead(levelId));
  const isRead     = readPages.includes(index);
  const isLastRead = lastRead?.idx === index;
  const gradStyle  = level ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` } : {};

  return (
    <div className={`group bg-white rounded-2xl border shadow-sm overflow-hidden
      hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
      ${isRead ? 'border-green-100' : 'border-slate-100'}`}>

      {/* Card top accent */}
      <div className="h-1.5 w-full" style={gradStyle} />

      <div className="p-5">
        {/* Type badge + read status */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
            ${page.type === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {page.type === 'pdf' ? <FileText size={10} /> : <BookOpen size={10} />}
            {page.type === 'pdf' ? 'PDF' : 'Article'}
          </span>
          {isRead && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-600">
              <CheckCircle size={10} /> Read
            </span>
          )}
          {!isRead && isLastRead && (
            <span className="text-[10px] font-semibold text-amber-500">In Progress</span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-sm leading-snug mb-1.5 line-clamp-2"
          style={{ fontFamily: 'Space Grotesk' }}>
          {page.title || page.pdfName || `Material ${index + 1}`}
        </h3>

        {/* Meta pills */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Layers size={10} /> {getSectionCount(page)}
          </span>
          <span className="text-slate-200 text-[10px]">·</span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
            <Clock size={10} /> {estimateReadTime(page)} read
          </span>
          {isLastRead && lastRead && (
            <>
              <span className="text-slate-200 text-[10px]">·</span>
              <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                Last read {timeAgo(lastRead.time)}
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 rounded-full mb-4 overflow-hidden">
          <div className="h-1 rounded-full transition-all duration-500"
            style={{ width: isRead ? '100%' : '0%', ...gradStyle }} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRead(page, index)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={gradStyle}>
            <Play size={11} /> {isRead ? 'Read Again' : 'Read Now'}
          </button>
          {page.type !== 'pdf' && (
            <button
              onClick={() => onRead(page, index)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
              <Eye size={12} /> Preview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
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
  const [modalPage,     setModalPage]     = useState(null); // { page, index }
  const [, forceUpdate] = useState(0);

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
  const pages  = allContent[effectiveId] || [];
  const level  = sortedLevels.find(l => l.id === effectiveId);

  // Dashboard stats
  const totalMaterials = sortedLevels.reduce((s, l) => s + (allContent[l.id]?.length || 0), 0);
  const totalSections  = sortedLevels.reduce((s, l) => {
    return s + (allContent[l.id] || []).reduce((ss, p) =>
      ss + (p.type === 'pdf' ? (p.pageCount || 1) : (p.sections || []).length), 0);
  }, 0);

  const handleRead = useCallback((page, index) => {
    markRead(effectiveId, index);
    setModalPage({ page, index });
    forceUpdate(n => n + 1);
  }, [effectiveId]);

  const handleCloseModal = useCallback(() => {
    setModalPage(null);
    forceUpdate(n => n + 1); // refresh read state on cards
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading || !levelSettingsLoaded) {
    return (
      <div className="min-h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading materials…</p>
        </div>
      </div>
    );
  }

  if (sortedLevels.length === 0) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 px-10 text-center max-w-md">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="font-semibold text-slate-600">No levels available yet</p>
          <p className="text-slate-400 text-sm mt-1">Check back after your administrator configures exam levels.</p>
        </div>
      </div>
    );
  }

  const gradStyle = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : {};

  return (
    <div className="min-h-full bg-slate-50">

      {/* ── Dashboard header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100">
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={gradStyle}>
                  <BookMarked size={15} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
                  Study Materials
                </h1>
              </div>
              <p className="text-sm text-slate-400 ml-10.5">
                Browse all level content before attempting quizzes
              </p>
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { icon: BookOpen, label: 'Materials', value: totalMaterials, color: '#4F46E5' },
                { icon: Layers,   label: 'Sections',  value: totalSections,  color: '#8B5CF6' },
                { icon: BookMarked, label: 'Levels',  value: sortedLevels.length, color: '#10B981' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-100 bg-slate-50">
                  <s.icon size={14} style={{ color: s.color }} />
                  <span className="text-sm font-bold text-slate-700">{s.value}</span>
                  <span className="text-xs text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Level tabs */}
          <div className="flex gap-2 flex-wrap mt-5">
            {sortedLevels.map(l => {
              const isActive  = l.id === effectiveId;
              const pageCount = (allContent[l.id] || []).length;
              const readCount = getReadPages(l.id).length;
              const pct       = pageCount > 0 ? Math.round((readCount / pageCount) * 100) : 0;
              return (
                <button key={l.id}
                  onClick={() => setActiveLevelId(l.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all hover:scale-[1.02]"
                  style={isActive ? {
                    background: `linear-gradient(135deg, ${l.color.from}, ${l.color.to})`,
                    color: '#fff', border: 'none',
                    boxShadow: `0 4px 14px ${l.color.from}40`,
                  } : {
                    background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
                  }}>
                  <BookOpen size={13} />
                  {l.title}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={isActive
                      ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                      : { background: '#e2e8f0', color: '#94a3b8' }}>
                    {pageCount}
                  </span>
                  {pct > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={isActive
                        ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                        : { background: '#dcfce7', color: '#16a34a' }}>
                      {pct}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

        {pages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-24 text-center">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="font-semibold text-slate-600">No content yet for this level</p>
            <p className="text-slate-400 text-sm mt-1">Check back after your teacher adds study material.</p>
          </div>
        ) : (
          <>
            {/* Level context banner */}
            {level && (
              <div className="rounded-2xl p-4 mb-5 flex items-center gap-4 text-white relative overflow-hidden"
                style={gradStyle}>
                <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/20 to-transparent" />
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 relative z-10">
                  <BookOpen size={18} />
                </div>
                <div className="relative z-10 flex-1 min-w-0">
                  <p className="font-bold text-white">{level.title}</p>
                  {level.subtitle && <p className="text-white/70 text-xs mt-0.5">{level.subtitle}</p>}
                </div>
                <div className="relative z-10 text-right shrink-0">
                  <p className="text-white font-bold text-lg">{pages.length}</p>
                  <p className="text-white/70 text-[10px]">materials</p>
                </div>
              </div>
            )}

            {/* Material cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page, i) => (
                <MaterialCard
                  key={i}
                  page={page}
                  index={i}
                  levelId={effectiveId}
                  level={level}
                  onRead={handleRead}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Reader Modal ─────────────────────────────────────────────── */}
      {modalPage && (
        <ReaderModal
          page={modalPage.page}
          level={level}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

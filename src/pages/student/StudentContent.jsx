import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BookOpen, FileText, Clock, ChevronLeft, ChevronRight,
  Download, ExternalLink, Play, Layers, X, CheckCircle,
  Loader2, BookMarked, ZoomIn, ZoomOut, Maximize2,
  AlertCircle,
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

// ── Helpers ───────────────────────────────────────────────────────────────

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

// ── localStorage read tracking ────────────────────────────────────────────

function markRead(levelId, pageIdx) {
  try {
    const key  = `content_read_${levelId}`;
    const read = JSON.parse(localStorage.getItem(key) || '[]');
    if (!read.includes(pageIdx)) localStorage.setItem(key, JSON.stringify([...read, pageIdx]));
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
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── PDF.js loader (CDN, once per session) ────────────────────────────────

const PDFJS_VERSION = '3.11.174';
const PDFJS_CDN     = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

let pdfJsLoadPromise = null;
function loadPdfJs() {
  if (pdfJsLoadPromise) return pdfJsLoadPromise;
  pdfJsLoadPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const s = document.createElement('script');
    s.src = `${PDFJS_CDN}/pdf.min.js`;
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;
      resolve(window.pdfjsLib);
    };
    s.onerror = () => { pdfJsLoadPromise = null; reject(new Error('PDF.js CDN load failed')); };
    document.head.appendChild(s);
  });
  return pdfJsLoadPromise;
}

// ══════════════════════════════════════════════════════════════════════════
// PDF Canvas Reader — fully custom, no browser PDF chrome
// ══════════════════════════════════════════════════════════════════════════
function PDFCanvasReader({ pdfData, filename, level, onClose }) {
  const [pdfDoc,   setPdfDoc]   = useState(null);
  const [pageNum,  setPageNum]  = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom,     setZoom]     = useState(1.0);   // 1.0 = fit width
  const [status,   setStatus]   = useState('loading'); // loading | ready | error
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const renderRef    = useRef(null); // current render task

  const gradStyle = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' };

  // Build blob URL once
  const blobUrl = useMemo(() => buildBlobUrl(pdfData), [pdfData]);

  // Load PDF document
  useEffect(() => {
    if (!blobUrl) { setStatus('error'); return; }
    let cancelled = false;
    loadPdfJs()
      .then(pdfjs => pdfjs.getDocument({ url: blobUrl }).promise)
      .then(doc => {
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [blobUrl]);

  // Render current page whenever doc / page / zoom changes
  useEffect(() => {
    if (!pdfDoc || status !== 'ready' || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      try {
        // Cancel previous render
        if (renderRef.current) { renderRef.current.cancel(); renderRef.current = null; }

        const page         = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        // Fill the full container width, then apply zoom multiplier
        const containerW   = containerRef.current?.clientWidth ?? 800;
        const baseViewport = page.getViewport({ scale: 1 });
        const fitScale     = containerW / baseViewport.width;
        const finalScale   = fitScale * zoom;

        const viewport = page.getViewport({ scale: finalScale });
        const canvas   = canvasRef.current;
        if (!canvas || cancelled) return;

        // Handle HiDPI screens
        const dpr      = window.devicePixelRatio || 1;
        canvas.width   = viewport.width  * dpr;
        canvas.height  = viewport.height * dpr;
        canvas.style.width  = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const task = page.render({ canvasContext: ctx, viewport });
        renderRef.current = task;
        await task.promise;
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException') setStatus('error');
      }
    };

    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, zoom, status]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  setPageNum(p => Math.min(p + 1, numPages));
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    setPageNum(p => Math.max(p - 1, 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [numPages, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Cleanup blob URL
  useEffect(() => () => { if (blobUrl?.startsWith('blob:')) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  const progress = numPages > 1 ? ((pageNum - 1) / (numPages - 1)) * 100 : 100;
  const atStart  = pageNum === 1;
  const atEnd    = pageNum === numPages;

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-slate-100 shrink-0">
        {/* File icon + title */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white" style={gradStyle}>
          <FileText size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{filename || 'Document'}</p>
          <p className="text-[10px] text-slate-400 font-medium">
            {status === 'loading' ? 'Loading document…'
              : status === 'error' ? 'Could not load'
              : `Page ${pageNum} of ${numPages}`}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom out */}
          <button
            onClick={() => setZoom(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
            title="Zoom out"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <ZoomOut size={14} />
          </button>
          {/* Zoom level */}
          <button
            onClick={() => setZoom(1.0)}
            title="Reset to fit width"
            className="px-2 h-7 rounded-md text-[11px] font-bold text-slate-500 hover:bg-slate-100 transition-colors min-w-[46px]">
            {Math.round(zoom * 100)}%
          </button>
          {/* Zoom in */}
          <button
            onClick={() => setZoom(z => Math.min(3, parseFloat((z + 0.25).toFixed(2))))}
            title="Zoom in"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <ZoomIn size={14} />
          </button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Download */}
          {blobUrl && (
            <a href={blobUrl} download={filename || 'document.pdf'}
              title="Download"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              <Download size={14} />
            </a>
          )}
          {/* Open in browser tab */}
          {blobUrl && (
            <a href={blobUrl} target="_blank" rel="noreferrer"
              title="Open in new tab"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
              <ExternalLink size={14} />
            </a>
          )}

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Close */}
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Reading progress bar ── */}
      <div className="h-0.5 bg-slate-100 shrink-0">
        <div className="h-0.5 transition-all duration-500"
          style={{ width: `${progress}%`, ...gradStyle }} />
      </div>

      {/* ── Canvas viewport ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-white"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 min-h-64">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={gradStyle}>
              <Loader2 size={24} className="animate-spin text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Loading document…</p>
            <p className="text-xs text-slate-400">Fetching pages from server</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center h-full gap-4 min-h-64 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Could not render this document</p>
              <p className="text-sm text-slate-400 mt-1">The PDF may be corrupted or unavailable.</p>
            </div>
            {blobUrl && (
              <a href={blobUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
                style={gradStyle}>
                <ExternalLink size={14} /> Open in Browser
              </a>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div className="w-full bg-white">
            <canvas
              ref={canvasRef}
              style={{ display: 'block', width: '100%' }}
            />
          </div>
        )}
      </div>

      {/* ── Page navigation footer ── */}
      {status === 'ready' && numPages > 0 && (
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-t border-slate-100 shrink-0 bg-white">

          <button
            onClick={() => setPageNum(p => Math.max(1, p - 1))}
            disabled={atStart}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all disabled:cursor-not-allowed">
            <ChevronLeft size={15} /> Previous
          </button>

          {/* Page indicator + dots */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 tabular-nums">
              {pageNum} <span className="text-slate-300">/</span> {numPages}
            </span>
            {numPages > 1 && numPages <= 12 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: numPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPageNum(i + 1)}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width:      pageNum === i + 1 ? 16 : 5,
                      height:     5,
                      background: pageNum === i + 1 ? (level?.color?.from || '#4F46E5') : '#e2e8f0',
                    }}
                  />
                ))}
              </div>
            )}
            {numPages > 12 && (
              <input
                type="range" min={1} max={numPages} value={pageNum}
                onChange={e => setPageNum(Number(e.target.value))}
                className="w-32 h-1 accent-indigo-500"
              />
            )}
          </div>

          <button
            onClick={() => setPageNum(p => Math.min(numPages, p + 1))}
            disabled={atEnd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all disabled:cursor-not-allowed">
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Text Article Reader
// ══════════════════════════════════════════════════════════════════════════
function TextReader({ page, level, onClose }) {
  const gradStyle = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : {};

  // Keyboard close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const wordCount = (page.sections || []).reduce(
    (s, sec) => s + (sec.body || '').split(/\s+/).length, 0
  );
  const readTime = Math.max(1, Math.round(wordCount / 200));

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white" style={gradStyle}>
          <BookOpen size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">
            {page.title || 'Study Material'}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {(page.sections || []).length} sections · ~{readTime} min read
          </p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors ml-2">
          <X size={15} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 md:px-0 py-8 space-y-5">

          {/* Article hero */}
          <div className="rounded-2xl p-6 text-white relative overflow-hidden" style={gradStyle}>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10 blur-3xl bg-white" />
            <div className="relative z-10">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1.5">
                {level?.title}
              </p>
              <h1 className="text-xl font-bold leading-snug" style={{ fontFamily: 'Space Grotesk' }}>
                {page.title || 'Study Material'}
              </h1>
              <div className="flex items-center gap-3 mt-3 text-white/60 text-xs">
                <span className="flex items-center gap-1"><Clock size={10} /> ~{readTime} min read</span>
                <span>·</span>
                <span>{wordCount.toLocaleString()} words</span>
              </div>
            </div>
          </div>

          {/* Sections */}
          {(page.sections || []).map((sec, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50"
                style={{ background: '#fafafa' }}>
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={gradStyle}>{i + 1}</span>
                <h2 className="text-base font-bold text-slate-800 leading-snug"
                  style={{ fontFamily: 'Space Grotesk' }}>
                  {sec.heading}
                </h2>
              </div>
              <div className="px-5 py-5 space-y-2.5">
                {(sec.body || '').split('\n').map((line, li) => {
                  if (!line.trim()) return <div key={li} className="h-1" />;
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={li} className="text-sm text-slate-600 leading-[1.85]">
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
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Reader Modal wrapper
// ══════════════════════════════════════════════════════════════════════════
function ReaderModal({ page, level, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — full height on mobile, constrained on desktop */}
      <div className="absolute inset-0 md:inset-6 lg:inset-10 xl:inset-16 rounded-none md:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {page.type === 'pdf' ? (
          <PDFCanvasReader
            pdfData={page.pdfData}
            filename={page.title || 'Study Material'}
            level={level}
            onClose={onClose}
          />
        ) : (
          <TextReader
            page={page}
            level={level}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Material Card
// ══════════════════════════════════════════════════════════════════════════
function MaterialCard({ page, index, levelId, level, onRead }) {
  const readPages = getReadPages(levelId);
  const lastRead  = getLastRead(levelId);
  const isRead     = readPages.includes(index);
  const isLastRead = lastRead?.idx === index;
  const gradStyle  = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : {};

  return (
    <div className={`group bg-white rounded-2xl border shadow-sm overflow-hidden
      hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer
      ${isRead ? 'border-green-100' : 'border-slate-100'}`}
      onClick={() => onRead(page, index)}>

      {/* Gradient top accent */}
      <div className="h-1 w-full" style={gradStyle} />

      <div className="p-5">
        {/* Top row: type badge + read badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
            ${page.type === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {page.type === 'pdf' ? <FileText size={9} /> : <BookOpen size={9} />}
            {page.type === 'pdf' ? 'PDF Document' : 'Article'}
          </span>
          {isRead ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
              <CheckCircle size={10} /> Read
            </span>
          ) : isLastRead ? (
            <span className="text-[10px] font-semibold text-amber-500">In progress</span>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-sm leading-snug mb-2 line-clamp-2"
          style={{ fontFamily: 'Space Grotesk' }}>
          {page.title || `Study Material ${index + 1}`}
        </h3>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock size={9} /> {estimateReadTime(page)} read
          </span>
          {isLastRead && lastRead && (
            <>
              <span className="text-slate-200 text-[10px]">·</span>
              <span className="text-[10px] text-amber-500">
                Last read {timeAgo(lastRead.time)}
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 rounded-full mb-4 overflow-hidden">
          <div className="h-1 rounded-full transition-all duration-700"
            style={{ width: isRead ? '100%' : '0%', ...gradStyle }} />
        </div>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-xl transition-all"
            style={gradStyle}>
            <Play size={11} /> Open
          </span>
          <span className="text-[10px] text-slate-400 font-medium group-hover:text-slate-600 transition-colors">
            Click to read →
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════
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
  const [modalItem,     setModalItem]     = useState(null); // { page, index }
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (sortedLevels.length > 0 && activeLevelId === null) {
      setActiveLevelId(sortedLevels[0].id);
    }
  }, [sortedLevels.length]); // eslint-disable-line

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
  }, [user?.id, levelSettingsLoaded, sortedLevels.length]); // eslint-disable-line

  const effectiveId = activeLevelId ?? sortedLevels[0]?.id;
  const pages  = allContent[effectiveId] || [];
  const level  = sortedLevels.find(l => l.id === effectiveId);

  // Summary stats
  const totalMaterials = sortedLevels.reduce((s, l) => s + (allContent[l.id]?.length || 0), 0);
  const totalSections  = sortedLevels.reduce((s, l) =>
    s + (allContent[l.id] || []).reduce((ss, p) =>
      ss + (p.type === 'pdf' ? (p.pageCount || 1) : (p.sections || []).length), 0), 0);

  const handleRead = useCallback((page, index) => {
    markRead(effectiveId, index);
    setModalItem({ page, index });
    forceUpdate(n => n + 1);
  }, [effectiveId]);

  const handleCloseModal = useCallback(() => {
    setModalItem(null);
    forceUpdate(n => n + 1);
  }, []);

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

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100">
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={gradStyle}>
                  <BookMarked size={15} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
                  Study Materials
                </h1>
              </div>
              <p className="text-sm text-slate-400 ml-10.5">
                Click any card to open the full reading experience
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { icon: BookOpen, label: 'Materials', value: totalMaterials, color: '#4F46E5' },
                { icon: Layers,   label: 'Sections',  value: totalSections,  color: '#8B5CF6' },
                { icon: Maximize2, label: 'Levels',   value: sortedLevels.length, color: '#10B981' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50">
                  <s.icon size={13} style={{ color: s.color }} />
                  <span className="text-sm font-bold text-slate-700">{s.value}</span>
                  <span className="text-[10px] text-slate-400">{s.label}</span>
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
                  } : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                  <BookOpen size={12} />
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

      {/* ── Material cards ─────────────────────────────────────────── */}
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
        {pages.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-24 text-center">
            <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="font-semibold text-slate-600">No content for this level yet</p>
            <p className="text-slate-400 text-sm mt-1">Your teacher hasn't added study material here.</p>
          </div>
        ) : (
          <>
            {/* Level banner */}
            {level && (
              <div className="rounded-2xl p-4 mb-5 text-white relative overflow-hidden" style={gradStyle}>
                <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{level.title}</p>
                    {level.subtitle && <p className="text-white/60 text-xs mt-0.5">{level.subtitle}</p>}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-white font-bold">{pages.length}</p>
                    <p className="text-white/60 text-[10px]">materials</p>
                  </div>
                </div>
              </div>
            )}

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

      {/* ── Reader modal ───────────────────────────────────────────── */}
      {modalItem && (
        <ReaderModal
          page={modalItem.page}
          level={level}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

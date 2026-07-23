import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, ChevronLeft, ChevronRight, CheckCircle,
  Loader2, BookMarked, AlertCircle, Bookmark, BookmarkCheck,
  BarChart2, ArrowLeft, FileText, Download, ExternalLink,
  ZoomIn, ZoomOut, PlayCircle, X, Play,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { LEVELS } from '../../utils/levelData';
import { api } from '../../utils/api';
import { youtubeEmbedUrl, youtubeId } from '../../utils/helpers';
import { downloadWatermarkedPdf } from '../../utils/pdfWatermark';
import DOMPurify from 'dompurify';

// ── Color palette ─────────────────────────────────────────────────────────
const FALLBACK_COLORS = [
  { from: '#3BC0EF', to: '#1E3A8A' },
  { from: '#8B5CF6', to: '#6d28d9' },
  { from: '#10B981', to: '#047857' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#B91C1C' },
  { from: '#EC4899', to: '#BE185D' },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function buildBlobUrl(pdfData) {
  if (!pdfData) return null;
  if (!pdfData.startsWith('data:')) return pdfData;
  try {
    const [header, b64] = pdfData.split(',');
    const mime = header.match(/:(.*?);/)[1];
    const bstr = atob(b64);
    const u8   = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
    return URL.createObjectURL(new Blob([u8], { type: mime }));
  } catch { return pdfData; }
}

// File extensions browsers CANNOT display inline (Office documents). These must
// go through an online viewer; PDFs and images render in the browser natively.
const OFFICE_EXTS = ['xls', 'xlsx', 'doc', 'docx', 'ppt', 'pptx', 'csv'];

function fileExt(url = '', name = '') {
  const src = name || url.split('?')[0];
  return (src.split('.').pop() || '').toLowerCase();
}

// Open a study material in a new tab. Materials may be PDFs OR Office files
// (a "pdf"-type content page can hold an .xlsx/.docx). PDFs render inline in the
// browser's native viewer; Office files can't, so they open in Microsoft's
// Office Online viewer, which renders them from a public URL. Requires the file
// to be publicly reachable (our S3 objects are).
function openMaterialInNewTab(url, name = '') {
  if (!url) return;
  const ext = fileExt(url, name);
  if (OFFICE_EXTS.includes(ext)) {
    const viewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
    window.open(viewer, '_blank', 'noopener,noreferrer');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── localStorage helpers ──────────────────────────────────────────────────
const ls = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore quota errors */ } },
};

function markRead(lid, idx) {
  const key   = `cr_read_${lid}`;
  const reads = ls.get(key, []);
  if (!reads.includes(idx)) ls.set(key, [...reads, idx]);
  ls.set(`cr_last_${lid}`,      idx);
  ls.set(`cr_last_ts_${lid}`,   Date.now());
}
function getReadList(lid)   { return ls.get(`cr_read_${lid}`,    []); }
function getLastRead(lid)   { const i = ls.get(`cr_last_${lid}`, null); const t = ls.get(`cr_last_ts_${lid}`, null); return (i !== null && t) ? { idx: i, ts: t } : null; }
function getBookmarks(lid)  { return ls.get(`cr_bm_${lid}`,      []); }
function setBookmarks(lid, b) { ls.set(`cr_bm_${lid}`, b); }
function savePage(lid, idx) { ls.set(`cr_pos_${lid}`, idx); }

// ── PDF.js CDN loader ─────────────────────────────────────────────────────
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174`;
let _pdfPromise = null;
function loadPdfJs() {
  if (_pdfPromise) return _pdfPromise;
  _pdfPromise = new Promise((res, rej) => {
    if (window.pdfjsLib) { res(window.pdfjsLib); return; }
    const s  = document.createElement('script');
    s.src    = `${PDFJS_CDN}/pdf.min.js`;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`; res(window.pdfjsLib); };
    s.onerror = () => { _pdfPromise = null; rej(new Error('PDF.js load failed')); };
    document.head.appendChild(s);
  });
  return _pdfPromise;
}

// ══════════════════════════════════════════════════════════════════════════
// PDF page renderer (clean canvas, no toolbar chrome)
// ══════════════════════════════════════════════════════════════════════════
function PDFPageRenderer({ pdfData, pageNum, zoom, onDocLoaded }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [status, setStatus] = useState('loading');
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const renderRef    = useRef(null);

  const blobUrl = useMemo(() => buildBlobUrl(pdfData), [pdfData]);

  useEffect(() => {
    if (!blobUrl) { setStatus('error'); return; }
    let cancelled = false;
    loadPdfJs()
      .then(lib => lib.getDocument({ url: blobUrl }).promise)
      .then(doc  => {
        if (cancelled) return;
        setPdfDoc(doc);
        setStatus('ready');
        onDocLoaded?.(doc.numPages);
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [blobUrl]); // eslint-disable-line

  useEffect(() => {
    if (!pdfDoc || status !== 'ready' || !canvasRef.current) return;
    let cancelled = false;

    const render = async () => {
      try {
        if (renderRef.current) { renderRef.current.cancel(); renderRef.current = null; }
        const page       = await pdfDoc.getPage(pageNum);
        if (cancelled)   return;
        const cw         = containerRef.current?.clientWidth || 680;
        const base       = page.getViewport({ scale: 1 });
        const scale      = (cw / base.width) * zoom;
        const viewport   = page.getViewport({ scale });
        const canvas     = canvasRef.current;
        if (!canvas || cancelled) return;
        const dpr        = window.devicePixelRatio || 1;
        canvas.width     = viewport.width  * dpr;
        canvas.height    = viewport.height * dpr;
        canvas.style.width  = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx        = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const task = page.render({ canvasContext: ctx, viewport });
        renderRef.current = task;
        await task.promise;
      } catch (e) { if (e?.name !== 'RenderingCancelledException') console.warn(e); }
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, zoom, status]);

  useEffect(() => () => { if (blobUrl?.startsWith('blob:')) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 size={28} className="animate-spin text-indigo-400" />
        <p className="text-sm text-slate-400">Loading document…</p>
      </div>
    );
  }
  if (status === 'error') {
    // pdf.js couldn't render the file — most often because the document is hosted
    // on S3 without CORS headers (the JS fetch is blocked), or the pdf.js CDN
    // didn't load. Fall back to the browser's NATIVE inline PDF viewer via an
    // <iframe>, which displays the document without needing CORS, so the reader
    // still works. Only if there is no URL at all do we show a hard error.
    if (!blobUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
          <AlertCircle size={32} className="text-rose-400" />
          <p className="font-semibold text-slate-700">Could not load this document</p>
        </div>
      );
    }
    return (
      <div className="w-full">
        <iframe src={blobUrl} title="Document"
          className="w-full rounded-xl border border-slate-200 bg-white"
          style={{ height: '72vh' }} />
        <div className="flex items-center justify-center mt-3">
          <a href={blobUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <ExternalLink size={13} /> Open in New Tab
          </a>
        </div>
      </div>
    );
  }
  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Article renderer — Notion-style reading column
// ══════════════════════════════════════════════════════════════════════════
function ArticleBody({ page }) {
  return (
    <div className="space-y-8">
      {(page.sections || []).map((sec, i) => (
        <section key={i}>
          {/* Section heading */}
          <div className="flex items-start gap-3 mb-4">
            <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold text-white bg-slate-800">
              {i + 1}
            </span>
            <h2 className="text-xl font-bold text-slate-900 leading-snug"
              style={{ fontFamily: 'Space Grotesk' }}>
              {sec.heading}
            </h2>
          </div>

          {/* Body — the admin editor (RichTextEditor) stores HTML, so render it as
              sanitised HTML. Previously this split on '\n' and showed it as plain
              text, which leaked raw <p>/<strong>/<ul> tags to the reader. Kept in
              sync with LevelContent, which already renders the same field as HTML. */}
          <div className="pl-9 rich-content text-[15px] text-slate-700 leading-[1.85]"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sec.body || '') }} />

          {/* Section divider (not on last) */}
          {i < (page.sections || []).length - 1 && (
            <div className="mt-8 border-b border-slate-100" />
          )}
        </section>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Content Reader — distraction-free full-page experience
// ══════════════════════════════════════════════════════════════════════════
function ContentReader({ pages, startIndex, levelId, level, onBack, onReadStateChange }) {
  const [currentIdx, setCurrentIdx] = useState(startIndex);
  const [bookmarks,  setBookmarksState] = useState(() => getBookmarks(levelId));
  const [pdfPages,   setPdfPages]   = useState(0);  // total pages in PDF doc
  const [pdfPage,    setPdfPage]    = useState(1);   // current PDF page
  const [zoom,       setZoom]       = useState(1.0);
  const [downloading, setDownloading] = useState(false);
  const scrollRef = useRef(null);

  const page       = pages[currentIdx];
  const total      = pages.length;
  const readList   = getReadList(levelId);
  const isBookmarked = bookmarks.includes(currentIdx);

  const gradStyle = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' };

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Auto-save position + mark read
  useEffect(() => {
    markRead(levelId, currentIdx);
    savePage(levelId, currentIdx);
    onReadStateChange?.();
  }, [currentIdx, levelId]); // eslint-disable-line

  // Scroll to top when page changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setPdfPage(1); // reset PDF page on material change
  }, [currentIdx]);

  const goTo = useCallback((idx) => {
    setCurrentIdx(Math.max(0, Math.min(total - 1, idx)));
  }, [total]);

  const toggleBookmark = () => {
    const next = isBookmarked
      ? bookmarks.filter(b => b !== currentIdx)
      : [...bookmarks, currentIdx];
    setBookmarksState(next);
    setBookmarks(levelId, next);
  };

  // Download the material. Real PDFs get a faint diagonal "soham" watermark on
  // every page; Office files (.xlsx/.docx/…) can't be watermarked, so they
  // download as-is. Any failure falls back to a plain download so the button
  // never silently fails.
  const handleDownload = async () => {
    if (downloading || !page?.pdfData) return;
    const name = page.pdfName || page.title || 'document';
    const plainDownload = () => {
      const url = buildBlobUrl(page.pdfData);
      if (url) { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
    };
    if (fileExt(page.pdfData, page.pdfName) !== 'pdf') { plainDownload(); return; }
    setDownloading(true);
    try {
      await downloadWatermarkedPdf(page.pdfData, name, 'soham');
    } catch (err) {
      console.warn('Watermarked download failed, downloading original:', err?.message);
      plainDownload();
    } finally {
      setDownloading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        if (page.type === 'pdf' && pdfPage < pdfPages) setPdfPage(p => p + 1);
        else goTo(currentIdx + 1);
      }
      if (e.key === 'ArrowLeft') {
        if (page.type === 'pdf' && pdfPage > 1) setPdfPage(p => p - 1);
        else goTo(currentIdx - 1);
      }
      if (e.key === 'Escape') onBack();
      if (e.key === 'b' || e.key === 'B') toggleBookmark();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, pdfPage, pdfPages, page?.type, goTo, onBack, toggleBookmark]);  

  if (!page) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-100 shrink-0">
        {/* Top row */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3">
          {/* Back */}
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors shrink-0">
            <ArrowLeft size={16} /> Back
          </button>

          <div className="w-px h-4 bg-slate-200 shrink-0" />

          {/* Level + title */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
              {level?.title}
            </p>
            <p className="text-sm font-bold text-slate-800 truncate leading-snug">
              {page.title || `Study Material ${currentIdx + 1}`}
            </p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Bookmark */}
            <button onClick={toggleBookmark} title={isBookmarked ? 'Remove bookmark (B)' : 'Bookmark (B)'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
                ${isBookmarked ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`}>
              {isBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>

            {/* Material counter */}
            <span className="hidden sm:flex items-center text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {currentIdx + 1} / {total}
            </span>
          </div>
        </div>
      </header>

      {/* ── Reading area ──────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white">

        {/* ── Video reader (embedded YouTube + open-in-new-tab link) ── */}
        {page.type === 'video' && (
          <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10 pb-24">
            <div className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white" style={gradStyle}>
                {level?.title}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug mt-3"
                style={{ fontFamily: 'Space Grotesk' }}>
                {page.title || `Study Material ${currentIdx + 1}`}
              </h1>
            </div>

            {youtubeEmbedUrl(page.pdfData) ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video shadow-sm">
                <iframe src={youtubeEmbedUrl(page.pdfData)} title={page.title || 'Video'}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                <ExternalLink size={28} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">This video opens on an external site.</p>
              </div>
            )}

            {/* Open-in-new-tab link (requested behaviour) */}
            {page.pdfData && (
              <a href={page.pdfData} target="_blank" rel="noreferrer noopener"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={gradStyle}>
                <ExternalLink size={15} /> Open video in new tab
              </a>
            )}

            {/* Bottom navigation */}
            <div className="mt-14 pt-8 border-t border-slate-100 flex items-center justify-between gap-4">
              <button onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all disabled:cursor-not-allowed">
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="flex-1 text-center"><p className="text-xs text-slate-400">{currentIdx + 1} of {total}</p></div>
              {currentIdx < total - 1 ? (
                <button onClick={() => goTo(currentIdx + 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style={gradStyle}>
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={onBack}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90" style={gradStyle}>
                  <CheckCircle size={15} /> Done
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Article reader ── */}
        {page.type !== 'pdf' && page.type !== 'video' && (
          <div className="max-w-[720px] mx-auto px-4 md:px-8 py-10 pb-24">

            {/* Article hero */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full text-white"
                  style={gradStyle}>
                  {level?.title}
                </span>
                {isBookmarked && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    <BookmarkCheck size={9} /> Bookmarked
                  </span>
                )}
                {readList.includes(currentIdx) && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    <CheckCircle size={9} /> Read
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug mb-4"
                style={{ fontFamily: 'Space Grotesk' }}>
                {page.title || `Study Material ${currentIdx + 1}`}
              </h1>

              <div className="flex items-center gap-4 text-sm text-slate-500 pb-6 border-b border-slate-100">
                <span className="flex items-center gap-1.5">
                  <BarChart2 size={13} /> {(page.sections || []).length} sections
                </span>
              </div>
            </div>

            {/* Article body */}
            <ArticleBody page={page} />

            {/* ── Bottom navigation ── */}
            <div className="mt-16 pt-8 border-t border-slate-100 flex items-center justify-between gap-4">
              <button
                onClick={() => goTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all disabled:cursor-not-allowed group">
                <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                Previous
              </button>

              <div className="flex-1 text-center">
                <p className="text-xs text-slate-400">{currentIdx + 1} of {total}</p>
              </div>

              {currentIdx < total - 1 ? (
                <button
                  onClick={() => goTo(currentIdx + 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 group"
                  style={gradStyle}>
                  Next
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <button onClick={onBack}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={gradStyle}>
                  <CheckCircle size={15} /> Done
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── PDF reader ── */}
        {page.type === 'pdf' && (
          <div className="max-w-[800px] mx-auto px-2 md:px-4 pb-24">

            {/* PDF controls bar */}
            <div className="flex items-center justify-between py-3 px-2 border-b border-slate-100 mb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-1.5">
                <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-slate-600 tabular-nums px-2">
                  {pdfPage} / {pdfPages || '…'}
                </span>
                <button onClick={() => setPdfPage(p => Math.min(pdfPages, p + 1))} disabled={pdfPage >= pdfPages}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-30 transition-colors">
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                  <ZoomOut size={13} />
                </button>
                <button onClick={() => setZoom(1.0)}
                  className="text-[11px] font-bold text-slate-500 hover:bg-slate-100 px-2 py-1 rounded-md transition-colors min-w-[42px] text-center">
                  {Math.round(zoom * 100)}%
                </button>
                <button onClick={() => setZoom(z => Math.min(2.5, parseFloat((z + 0.25).toFixed(2))))}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                  <ZoomIn size={13} />
                </button>
              </div>

              {page.pdfData && (
                <button onClick={handleDownload} disabled={downloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                  {downloading
                    ? <Loader2 size={11} className="animate-spin" />
                    : <Download size={11} />}
                  {downloading ? 'Preparing…' : 'Download'}
                </button>
              )}
            </div>

            <PDFPageRenderer
              pdfData={page.pdfData}
              pageNum={pdfPage}
              zoom={zoom}
              onDocLoaded={setPdfPages}
            />

            {/* PDF material navigation */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4 px-2">
              <button
                onClick={() => goTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all disabled:cursor-not-allowed">
                <ChevronLeft size={16} /> Previous Material
              </button>

              <div className="text-center">
                <p className="text-xs text-slate-400">{currentIdx + 1} of {total} materials</p>
              </div>

              {currentIdx < total - 1 ? (
                <button onClick={() => goTo(currentIdx + 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={gradStyle}>
                  Next Material <ChevronRight size={16} />
                </button>
              ) : (
                <button onClick={onBack}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={gradStyle}>
                  <CheckCircle size={15} /> Done
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Video Lesson — embedded YouTube player, played inline (no new tab)
// ══════════════════════════════════════════════════════════════════════════
function VideoLesson({ page, index, levelId, onWatched }) {
  const embed  = youtubeEmbedUrl(page.pdfData);
  const vid    = youtubeId(page.pdfData);
  const thumb  = vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null;
  const isRead = getReadList(levelId).includes(index);
  const [open, setOpen] = useState(false); // modal player closed until clicked

  // Mark the lesson as "read" the first time it's watched.
  const markWatched = () => {
    if (!getReadList(levelId).includes(index)) {
      markRead(levelId, index);
      onWatched?.();
    }
  };

  const play = () => { markWatched(); setOpen(true); };

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
        <span className="text-[11px] font-bold text-slate-400 tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="flex-1 font-bold text-slate-800 text-[15px] leading-snug truncate"
          style={{ fontFamily: 'Space Grotesk' }}>
          {page.title || `Video ${index + 1}`}
        </h3>
        {isRead && <CheckCircle size={15} className="text-green-500 shrink-0" />}
      </div>

      {/* Clickable poster — opens the modal player */}
      {embed ? (
        <button onClick={play}
          className="relative w-full aspect-video bg-slate-900 group block overflow-hidden">
          {thumb && (
            <img src={thumb} alt="" loading="lazy"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-70 transition-opacity" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Play size={26} className="text-slate-900 ml-1" fill="currentColor" />
            </span>
          </span>
        </button>
      ) : (
        <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center gap-3 text-center px-6">
          <ExternalLink size={26} className="text-slate-300" />
          <p className="text-sm text-slate-500">This video opens on an external site.</p>
          {page.pdfData && (
            <a href={page.pdfData} target="_blank" rel="noreferrer noopener" onClick={markWatched}
              className="text-sm font-semibold text-indigo-600 hover:underline">
              Open video
            </a>
          )}
        </div>
      )}

      {/* ── Modal player ── */}
      {open && embed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 md:p-8"
          onClick={() => setOpen(false)}>
          {/* Close (X) — top-right of the screen */}
          <button onClick={() => setOpen(false)} title="Close (Esc)"
            className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors">
            <X size={26} />
          </button>
          <div className="w-full max-w-5xl" onClick={e => e.stopPropagation()}>
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
              <iframe src={`${embed}?autoplay=1&rel=0`} title={page.title || 'Video'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Material Card — clean LMS style
// ══════════════════════════════════════════════════════════════════════════
function MaterialCard({ page, index, levelId, level, onRead }) {
  const readList   = getReadList(levelId);
  const lastRead   = getLastRead(levelId);
  const bookmarks  = getBookmarks(levelId);

  const isRead       = readList.includes(index);
  const isBookmarked = bookmarks.includes(index);
  const isLastVisited = lastRead?.idx === index;
  const isVideo      = page.type === 'video' && typeof page.pdfData === 'string' && page.pdfData;

  const gradStyle = level
    ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }
    : {};

  return (
    <div
      onClick={() => onRead(index)}
      className={`group relative bg-white rounded-2xl border shadow-sm overflow-hidden cursor-pointer h-full flex flex-col
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200
        ${isRead ? 'border-green-100' : 'border-slate-100'}`}
    >
      {/* Gradient accent line */}
      <div className="h-[3px]" style={gradStyle} />

      <div className="p-5 flex-1 flex flex-col">
        {/* Index + status row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-1.5">
            {isBookmarked && (
              <span className="w-5 h-5 flex items-center justify-center text-amber-400">
                <BookmarkCheck size={12} />
              </span>
            )}
            {isRead
              ? <span className="w-5 h-5 flex items-center justify-center"><CheckCircle size={13} className="text-green-500" /></span>
              : isLastVisited
                ? <span className="w-2 h-2 rounded-full bg-amber-400" />
                : <span className="w-2 h-2 rounded-full bg-slate-200" />
            }
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-[15px] leading-snug mb-3 line-clamp-2 min-h-[40px]"
          style={{ fontFamily: 'Space Grotesk' }}>
          {page.title || `Study Material ${index + 1}`}
        </h3>

        {/* Meta — "Last read" only (auto read-time estimate removed per client) */}
        {isLastVisited && lastRead && (
          <div className="flex items-center gap-3 text-[11px] mb-4">
            <span className="text-amber-500 font-medium">Last read {timeAgo(lastRead.ts)}</span>
          </div>
        )}

        {/* Action buttons — pinned to the bottom (mt-auto) so the primary button
            lines up across every card regardless of the meta/"Last read" line above */}
        <div className="mt-auto">
          {/* Read Now button */}
          <button
            onClick={e => { e.stopPropagation(); onRead(index); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={gradStyle}>
            {isRead ? <CheckCircle size={14} /> : isVideo ? <ExternalLink size={14} /> : <BookOpen size={14} />}
            {isVideo ? 'Watch Video' : 'Read Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════════════════
export default function StudentContent() {
  const { user } = useAuth();

  const [topics,     setTopics]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeId,   setActiveId]   = useState(null);
  const [readingIdx, setReadingIdx] = useState(null); // null = card list
  const [, forceUpdate] = useState(0);

  // Load standalone content topics (independent of exam levels / question banks).
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.getContentTopics()
      .then(data => {
        const list = (Array.isArray(data) ? data : []).map((t, idx) => ({
          id:       t.id,
          title:    t.title,
          subtitle: '',
          color:    FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
          pages:    Array.isArray(t.pages) ? t.pages : [],
        }));
        setTopics(list);
        setActiveId(cur => cur ?? (list[0]?.id ?? null));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const effectiveId = activeId ?? topics[0]?.id;
  const level = topics.find(t => t.id === effectiveId);
  const pages = level?.pages || [];

  // PDFs and videos open in a NEW browser tab (PDF → native viewer; video → the
  // YouTube/link URL). Text articles open in the in-app reader.
  const handleOpenReader = useCallback((idx) => {
    const page = pages[idx];
    if (page?.type === 'pdf' && typeof page.pdfData === 'string' && page.pdfData) {
      openMaterialInNewTab(page.pdfData, page.pdfName);
      markRead(effectiveId, idx);
      forceUpdate(n => n + 1);
      return;
    }
    if (page?.type === 'video' && typeof page.pdfData === 'string' && page.pdfData) {
      window.open(page.pdfData, '_blank', 'noopener,noreferrer');
      markRead(effectiveId, idx);
      forceUpdate(n => n + 1);
      return;
    }
    setReadingIdx(idx);
  }, [effectiveId, pages]);

  const handleCloseReader = useCallback(() => {
    setReadingIdx(null);
    forceUpdate(n => n + 1);
  }, []);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading content…</p>
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="min-h-full bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="font-semibold text-slate-600">No content available yet</p>
          <p className="text-slate-400 text-sm mt-1">Check back once your administrator adds study material.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Reader (full-screen takeover) ─────────────────────────── */}
      {readingIdx !== null && (
        <ContentReader
          pages={pages}
          startIndex={readingIdx}
          levelId={effectiveId}
          level={level}
          onBack={handleCloseReader}
          onReadStateChange={() => forceUpdate(n => n + 1)}
        />
      )}

      {/* ── Card list ─────────────────────────────────────────────── */}
      <div className="min-h-full bg-slate-50">

        {/* ── Page header ── */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">

            {/* Title + summary */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
                  Study Content
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Select a topic to start reading
                </p>
              </div>

            </div>

            {/* Topic tabs */}
            <div className="flex gap-2 flex-wrap">
              {topics.map(t => {
                const isActive = t.id === effectiveId;
                return (
                  <button key={t.id}
                    onClick={() => { setActiveId(t.id); setReadingIdx(null); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
                    style={isActive ? {
                      background: `linear-gradient(135deg, ${t.color.from}, ${t.color.to})`,
                      color: '#fff', border: 'none',
                      boxShadow: `0 4px 12px ${t.color.from}35`,
                    } : { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Cards grid ── */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {pages.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-24 text-center">
              <BookOpen size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="font-semibold text-slate-600">No materials yet</p>
              <p className="text-slate-400 text-sm mt-1">Your administrator hasn't added pages to this topic.</p>
            </div>
          ) : (() => {
            // Split the topic's pages into two stacked sections: Videos (embedded
            // lessons, played inline) and Study Material (text / PDF cards). Keep
            // each page's ORIGINAL index so read tracking and the reader still
            // line up after filtering.
            const withIdx   = pages.map((page, i) => ({ page, i }));
            const videos    = withIdx.filter(({ page }) => page.type === 'video');
            const materials = withIdx.filter(({ page }) => page.type !== 'video');

            return (
              <div className="space-y-10">
                {/* ── Videos section ── */}
                {videos.length > 0 && (
                  <section>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4"
                      style={{ fontFamily: 'Space Grotesk' }}>
                      <PlayCircle size={18} className="text-indigo-500" /> Videos
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videos.map(({ page, i }) => (
                        <VideoLesson
                          key={i}
                          page={page}
                          index={i}
                          levelId={effectiveId}
                          onWatched={() => forceUpdate(n => n + 1)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Study Material section ── */}
                {materials.length > 0 && (
                  <section>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-4"
                      style={{ fontFamily: 'Space Grotesk' }}>
                      <FileText size={18} className="text-indigo-500" /> Study Material
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {materials.map(({ page, i }) => (
                        <MaterialCard
                          key={i}
                          page={page}
                          index={i}
                          levelId={effectiveId}
                          level={level}
                          totalCards={pages.length}
                          onRead={handleOpenReader}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Standalone reader — mounted at /content/:levelId/read/:idx so "Read Now" can
// open a single study material in its own browser tab (full-screen, no sidebar).
// ══════════════════════════════════════════════════════════════════════════
export function ContentReaderPage() {
  const { levelId, idx } = useParams();
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const { levelSettings, levelSettingsLoaded } = useLevel();

  const id         = Number(levelId);
  const startIndex = Math.max(0, Number(idx) || 0);

  const [pages,   setPages]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    api.getContent(id)
      .then(p => setPages(Array.isArray(p) ? p : []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  // Build the level display object the same way the main page does.
  const dbLevel     = levelSettings[id];
  const staticLevel = LEVELS.find(l => l.id === id);
  const level = staticLevel ?? {
    id,
    title:    dbLevel?.title    || `Level ${id}`,
    subtitle: dbLevel?.subtitle || '',
    color:    FALLBACK_COLORS[(id - 1 + FALLBACK_COLORS.length) % FALLBACK_COLORS.length],
  };

  // This view runs in its own tab. Try to close it; browsers only allow
  // window.close() on script-opened tabs, so fall back to the content list.
  const handleBack = () => {
    window.close();
    navigate('/content');
  };

  if (loading || !levelSettingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
          <p className="text-slate-400 text-sm">Loading content…</p>
        </div>
      </div>
    );
  }

  if (!pages.length) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
          <p className="font-semibold text-slate-600">No content available</p>
          <button onClick={() => navigate('/content')}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Back to Content
          </button>
        </div>
      </div>
    );
  }

  return (
    <ContentReader
      pages={pages}
      startIndex={Math.min(startIndex, pages.length - 1)}
      levelId={id}
      level={level}
      onBack={handleBack}
    />
  );
}

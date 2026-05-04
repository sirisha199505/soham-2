import { useState } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, FileText, ExternalLink, Clock, Download,
} from 'lucide-react';
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

export default function StudentContent() {
  const { colors } = useTheme();
  const [activeLevelId, setActiveLevelId] = useState(1);
  const [pageIndex, setPageIndex]         = useState(0);
  const [pdfOpened, setPdfOpened]         = useState(false);

  const level = LEVELS.find(l => l.id === activeLevelId);
  const pages = getLevelPages(activeLevelId);
  const total = pages.length;
  const current = pages[pageIndex];

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

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
          Study Content
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Browse all level materials before attempting quizzes</p>
      </div>

      {/* Level tabs */}
      <div className="flex gap-2 flex-wrap">
        {LEVELS.map(l => {
          const isActive = l.id === activeLevelId;
          return (
            <button
              key={l.id}
              onClick={() => handleLevelChange(l.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
              style={isActive ? {
                background: `linear-gradient(135deg, ${l.color.from}, ${l.color.to})`,
                color: '#fff',
                border: 'none',
                boxShadow: `0 4px 14px ${l.color.from}40`,
              } : {
                background: '#fff',
                color: '#64748b',
                border: '1px solid #e2e8f0',
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
                {getLevelPages(l.id).length}p
              </span>
            </button>
          );
        })}
      </div>

      {total === 0 || !current ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">
          <BookOpen size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm">No content available for this level yet</p>
        </div>
      ) : (
        <>
          {/* Progress bar + page info */}
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
                    width: i === pageIndex ? 20 : 7,
                    height: 7,
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
                  {level.title} · {level.subtitle}
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
                  <a
                    href={current.pdfData}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setPdfOpened(true)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink size={12} /> Open
                  </a>
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

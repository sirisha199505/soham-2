import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Minus,
  Trophy, Shuffle, LayoutGrid, X, BookOpen, ChevronDown, ChevronUp,
  AlertTriangle, ListOrdered, Boxes, MapPin, GripVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { LEVELS } from '../../utils/levelData';
import {
  formatDuration, matchSelectedIndex, isMatchAllCorrect,
  isOrderAllCorrect, isCategorizeAllCorrect, isHotspotAllCorrect,
} from '../../utils/helpers';
import { generateLevelQuiz, recordUsedQuestions, saveQuizAttempt } from '../../utils/quizGenerator';
import { api } from '../../utils/api';
import { CATEGORY_META, CATEGORIES } from '../../utils/questionBank';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import DragDropReview from '../../components/quiz/DragDropReview';

function timerState(t) {
  if (t <= 30)  return 'critical';
  if (t <= 120) return 'warning';
  return 'normal';
}

// ─── Inline question review (shown on result screen) ─────────────────────
function ResultQuestionCard({ q, answer, index }) {
  const catMeta = CATEGORY_META[q.category] || { label: q.category, color: '#64748b', bg: '#f8fafc' };
  const isSkipped = answer === undefined || answer === null;
  const isCorrect = !isSkipped && isQuestionCorrect(q, answer);
  const statusColor = isSkipped ? '#94a3b8' : isCorrect ? '#16a34a' : '#dc2626';
  const statusBg    = isSkipped ? '#f8fafc'  : isCorrect ? '#f0fdf4' : '#fef2f2';

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: statusColor + '40' }}>
      {/* Question header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ background: statusBg, borderColor: statusColor + '20' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white"
          style={{ background: statusColor }}>
          {index}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1.5"
            style={{ background: catMeta.bg, color: catMeta.color }}>{catMeta.label}</span>
          <span className="text-sm font-semibold text-slate-800">{q.text}</span>
        </div>
        <div className="shrink-0 text-xs font-bold">
          {isSkipped
            ? <span className="flex items-center gap-1 text-slate-400"><Minus size={12}/> Skipped</span>
            : isCorrect
              ? <span className="flex items-center gap-1 text-green-600"><CheckCircle size={13}/> Correct</span>
              : <span className="flex items-center gap-1 text-red-600"><XCircle size={13}/> Wrong</span>}
        </div>
      </div>

      {/* Options / pairs */}
      <div className="px-4 py-3 space-y-2">
        {q.imageUrl && (
          <img src={q.imageUrl} alt="question" className="w-full max-h-40 object-contain bg-slate-50 rounded-xl border border-slate-100"/>
        )}

        {(q.type === 'mcq' || q.type === 'image' || q.type === 'label' || q.type === 'tf') && Array.isArray(q.options) && (
          <div className="grid gap-1.5">
            {q.options.map((opt, i) => {
              const text = getOptText(opt);
              const img  = getOptImage(opt);
              const isSelected = answer === i;
              const isCor = i === q.correct;
              let cls = 'border-slate-200 bg-slate-50 text-slate-500';
              if (isCor) cls = 'border-green-300 bg-green-50 text-green-700 font-semibold';
              if (isSelected && !isCor) cls = 'border-red-300 bg-red-50 text-red-700 font-semibold';
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${cls}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCor ? 'bg-green-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>{String.fromCharCode(65 + i)}</span>
                  {img && <img src={img} alt="" className="w-10 h-10 object-cover rounded-md border border-slate-200 shrink-0"/>}
                  {text && <span className="flex-1">{text}</span>}
                  {isSelected && !isCor && <span className="text-[10px] text-red-400 italic">(your answer)</span>}
                  {isCor && <CheckCircle size={12} className="text-green-500 shrink-0"/>}
                  {isSelected && !isCor && <XCircle size={12} className="text-red-500 shrink-0"/>}
                </div>
              );
            })}
          </div>
        )}

        {q.type === 'match' && q.pairs && (
          <div className="space-y-1.5">
            {q.pairs.map((pair, i) => {
              const selIdx = matchSelectedIndex(answer, i);
              const isCor  = selIdx === i;
              const selPair  = selIdx !== undefined ? q.pairs[selIdx] : null;
              const selRight = selPair ? (selPair.right || (selPair.rightImage ? '🖼' : '?')) : null;
              return (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
                  selIdx === undefined ? 'border-slate-200 bg-slate-50' :
                  isCor ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <span className="flex-1 flex items-center gap-1.5 font-medium text-slate-700">
                    {pair.leftImage && <img src={pair.leftImage} alt="" className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0"/>}
                    {pair.left}
                  </span>
                  <span className="text-slate-400 shrink-0">→</span>
                  <span className={`flex-1 flex items-center gap-1.5 font-semibold ${
                    selIdx === undefined ? 'text-slate-400' : isCor ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selPair?.rightImage && <img src={selPair.rightImage} alt="" className="w-8 h-8 object-cover rounded-md border border-slate-200 shrink-0"/>}
                    {selRight || <span className="text-slate-400 italic">Not answered</span>}
                    {!isCor && selIdx !== undefined && <span className="text-green-700 ml-1 font-normal">(correct: {pair.right || '🖼'})</span>}
                  </span>
                  {selIdx !== undefined && (isCor
                    ? <CheckCircle size={11} className="text-green-500 shrink-0"/>
                    : <XCircle size={11} className="text-red-500 shrink-0"/>)}
                </div>
              );
            })}
          </div>
        )}

        {(q.type === 'order' || q.type === 'categorize' || q.type === 'hotspot') && (
          <DragDropReview q={q} answer={answer}/>
        )}

        {q.explanation && (
          <div className="mt-1 bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 border border-blue-100">
            <span className="font-bold">Explanation: </span>{q.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Backward-compat helpers for image-enriched options/pairs ────────────
function getOptText(opt)  { return typeof opt === 'string' ? opt : (opt?.text || ''); }
function getOptImage(opt) { return typeof opt === 'string' ? '' : (opt?.imageUrl || ''); }

// ─── Drag-and-Drop Match Question ────────────────────────────────────────
function DragMatchQuestion({ q, answer, onChange }) {
  const placed = answer || {};
  const [shuffledRight] = useState(() => {
    const arr = q.pairs.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [selected,     setSelected]     = useState(null); // { rightIdx, from:'bank'|'slot', leftIdx }
  const [dragOverSlot, setDragOverSlot] = useState(null); // leftIdx | 'bank' | null
  const dragRef = useRef(null);

  const placedSet = new Set(Object.values(placed).map(Number));
  const unplaced  = shuffledRight.filter(ri => !placedSet.has(ri));
  const allPlaced = unplaced.length === 0;

  const placeCard = (rightIdx, fromSlotIdx, targetLeftIdx) => {
    const n = { ...placed };
    if (fromSlotIdx !== undefined) {
      const existingInTarget = n[targetLeftIdx];
      delete n[fromSlotIdx];
      if (existingInTarget !== undefined) n[fromSlotIdx] = existingInTarget;
    }
    n[targetLeftIdx] = rightIdx;
    onChange(n);
  };

  const removeFromSlot = (leftIdx) => {
    const n = { ...placed };
    delete n[leftIdx];
    onChange(n);
  };

  // ── Click interactions ────────────────────────────────────────────────
  const handleBankCardClick = (rightIdx) => {
    setSelected(s => (s?.rightIdx === rightIdx && s?.from === 'bank') ? null : { rightIdx, from: 'bank' });
  };
  const handleSlotClick = (leftIdx) => {
    const inSlot = placed[leftIdx];
    if (selected) {
      placeCard(selected.rightIdx, selected.from === 'slot' ? selected.leftIdx : undefined, leftIdx);
      setSelected(null);
    } else if (inSlot !== undefined) {
      setSelected({ rightIdx: Number(inSlot), from: 'slot', leftIdx });
    }
  };
  const handleBankAreaClick = () => {
    if (selected?.from === 'slot') removeFromSlot(selected.leftIdx);
    setSelected(null);
  };

  // ── HTML5 drag ────────────────────────────────────────────────────────
  const startDrag = (e, rightIdx, from, leftIdx) => {
    dragRef.current = { rightIdx, from, leftIdx };
    e.dataTransfer.effectAllowed = 'move';
    setSelected(null);
  };
  const endDrag = () => { dragRef.current = null; setDragOverSlot(null); };

  const dropOnSlot = (e, leftIdx) => {
    e.preventDefault();
    setDragOverSlot(null);
    const src = dragRef.current;
    if (!src) return;
    placeCard(src.rightIdx, src.from === 'slot' ? src.leftIdx : undefined, leftIdx);
    dragRef.current = null;
  };
  const dropOnBank = (e) => {
    e.preventDefault();
    setDragOverSlot(null);
    const src = dragRef.current;
    if (src?.from === 'slot') removeFromSlot(src.leftIdx);
    dragRef.current = null;
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-400 text-center font-medium">
        Drag cards to matching slots · or tap a card then tap a slot
      </p>

      {/* Answer Bank */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOverSlot('bank'); }}
        onDragLeave={() => setDragOverSlot(null)}
        onDrop={dropOnBank}
        onClick={handleBankAreaClick}
        className={`rounded-2xl border-2 p-3 min-h-[64px] transition-all duration-200 ${
          dragOverSlot === 'bank'
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-dashed border-slate-200 bg-slate-50/60'
        }`}>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Answer Bank</p>
        {allPlaced ? (
          <div className="flex items-center justify-center gap-1.5 py-1 text-green-600 text-sm font-semibold">
            <CheckCircle size={14}/> All items matched!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unplaced.map(rightIdx => {
              const rp    = q.pairs[rightIdx];
              const isSel = selected?.rightIdx === rightIdx && selected?.from === 'bank';
              return (
                <div key={rightIdx} draggable
                  onDragStart={e => startDrag(e, rightIdx, 'bank', undefined)}
                  onDragEnd={endDrag}
                  onClick={e => { e.stopPropagation(); handleBankCardClick(rightIdx); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold
                    cursor-grab active:cursor-grabbing select-none transition-all duration-150
                    ${isSel
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 scale-105 shadow-md ring-2 ring-indigo-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/30 hover:scale-[1.02]'
                    }`}>
                  {rp.rightImage && <img src={rp.rightImage} alt="" className="w-8 h-8 object-cover rounded-lg border border-slate-100"/>}
                  {rp.right}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Match slots */}
      <div className="space-y-2.5">
        {q.pairs.map((pair, leftIdx) => {
          const placedRightIdx = placed[leftIdx] !== undefined ? Number(placed[leftIdx]) : undefined;
          const rp             = placedRightIdx !== undefined ? q.pairs[placedRightIdx] : null;
          const isOver         = dragOverSlot === leftIdx;
          const isSlotSel      = selected?.from === 'slot' && selected?.leftIdx === leftIdx;
          const canDrop        = !!selected && !rp;

          return (
            <div key={leftIdx} className="flex items-stretch gap-2.5">
              {/* Left side */}
              <div className="flex-1 bg-white rounded-xl px-3 py-3 border border-slate-200 flex items-center gap-2 min-w-0 shadow-sm">
                {pair.leftImage && <img src={pair.leftImage} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0"/>}
                <span className="text-sm font-semibold text-slate-700 leading-snug">{pair.left}</span>
              </div>

              <span className="text-slate-300 text-base self-center shrink-0">→</span>

              {/* Drop zone */}
              <div
                draggable={!!rp}
                onDragStart={rp ? e => startDrag(e, placedRightIdx, 'slot', leftIdx) : undefined}
                onDragEnd={endDrag}
                onDragOver={e => { e.preventDefault(); setDragOverSlot(leftIdx); }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={e => dropOnSlot(e, leftIdx)}
                onClick={() => handleSlotClick(leftIdx)}
                className={`flex-1 rounded-xl border-2 px-3 py-3 min-h-[52px] flex items-center
                  transition-all duration-150 select-none
                  ${rp
                    ? `${isSlotSel ? 'border-indigo-400 bg-indigo-50 cursor-grab' : 'border-green-300 bg-green-50 cursor-grab'} active:cursor-grabbing`
                    : `border-dashed cursor-pointer ${
                        isOver || canDrop
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-slate-200 bg-slate-50/50 hover:border-indigo-200 hover:bg-slate-50'
                      }`
                  }`}>
                {rp ? (
                  <div className="flex items-center gap-2 w-full">
                    {rp.rightImage && <img src={rp.rightImage} alt="" className="w-8 h-8 object-cover rounded-lg shrink-0"/>}
                    <span className={`text-sm font-semibold flex-1 ${isSlotSel ? 'text-indigo-700' : 'text-green-700'}`}>{rp.right}</span>
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); removeFromSlot(leftIdx); setSelected(null); }}
                      className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center
                        text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors shrink-0">
                      <X size={9}/>
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs mx-auto font-medium transition-colors ${
                    isOver || canDrop ? 'text-indigo-400' : 'text-slate-300'
                  }`}>
                    {canDrop ? 'Tap to place' : 'Drop here'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Drag-and-Drop Label Question ─────────────────────────────────────────
function DragLabelQuestion({ q, answer, onChange }) {
  const opts = q.options || [];
  const [shuffledOpts] = useState(() => {
    const arr = opts.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [dragOver, setDragOver] = useState(false);
  const dragRef = useRef(null);

  const placed = answer; // number | null | undefined
  const getText = (opt) => (typeof opt === 'string' ? opt : opt?.text || '');

  const handleOptClick = (optIdx) => {
    onChange(placed === optIdx ? null : optIdx);
  };

  const handleDragStart = (e, optIdx) => {
    dragRef.current = optIdx;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDropToZone = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (dragRef.current !== null && dragRef.current !== undefined) onChange(dragRef.current);
    dragRef.current = null;
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-400 text-center font-medium">
        Drag a label to the answer zone · or tap to select
      </p>

      {/* Answer drop zone */}
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Answer</p>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDropToZone}
          onClick={(placed !== null && placed !== undefined) ? () => onChange(null) : undefined}
          className={`min-h-[60px] rounded-xl border-2 flex items-center px-4 py-3 transition-all duration-200 ${
            placed !== null && placed !== undefined
              ? 'border-green-300 bg-green-50 cursor-pointer'
              : dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-dashed border-slate-200 bg-slate-50'
          }`}>
          {(placed !== null && placed !== undefined) ? (
            <div className="flex items-center gap-3 w-full">
              <span className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {String.fromCharCode(65 + placed)}
              </span>
              <span className="text-sm font-semibold text-green-800 flex-1">{getText(opts[placed])}</span>
              <span className="text-[10px] text-green-500 font-medium">Tap to remove</span>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center w-full font-medium">
              {dragOver ? '↓ Release to place' : 'Drag or tap a label below'}
            </p>
          )}
        </div>
      </div>

      {/* Labels bank */}
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Labels</p>
        <div className="grid grid-cols-2 gap-2">
          {shuffledOpts.map(optIdx => {
            const text     = getText(opts[optIdx]);
            const isPlaced = placed === optIdx;
            return (
              <div key={optIdx}
                draggable={!isPlaced}
                onDragStart={!isPlaced ? e => handleDragStart(e, optIdx) : undefined}
                onDragEnd={() => { dragRef.current = null; }}
                onClick={() => handleOptClick(optIdx)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border-2 transition-all duration-150 select-none
                  ${isPlaced
                    ? 'border-green-200 bg-green-50/60 opacity-60 cursor-default'
                    : 'border-slate-200 bg-white text-slate-700 cursor-grab active:cursor-grabbing hover:border-indigo-200 hover:bg-indigo-50/30 hover:scale-[1.01]'
                  }`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                  ${isPlaced ? 'bg-green-200 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                  {String.fromCharCode(65 + optIdx)}
                </span>
                <span className={`text-sm font-semibold flex-1 ${isPlaced ? 'text-green-500' : ''}`}>{text}</span>
                {isPlaced && <CheckCircle size={12} className="text-green-500 shrink-0"/>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Helper: stable shuffle of an index list ───────────────────────────────
function useShuffledIndices(length) {
  const [order] = useState(() => {
    const arr = Array.from({ length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  return order;
}

const txtOf = (o) => (typeof o === 'string' ? o : o?.text || '');
const imgOf = (o) => (typeof o === 'string' ? '' : o?.imageUrl || '');

// ─── Ordering / Sequencing Question ────────────────────────────────────────
// Options are authored in the CORRECT order; the student drags the shuffled
// cards into numbered slots. answer = array where answer[slot] = optionIndex.
function OrderingQuestion({ q, answer, onChange }) {
  const opts = Array.isArray(q.options) ? q.options : [];
  const n = opts.length;
  const shuffled = useShuffledIndices(n);
  const placed = Array.isArray(answer) ? answer.slice(0, n) : Array(n).fill(null);
  while (placed.length < n) placed.push(null);

  const [selected, setSelected] = useState(null); // { optIdx, from:'bank'|'slot', slot }
  const [overSlot, setOverSlot] = useState(null);
  const dragRef = useRef(null);

  const placedSet = new Set(placed.filter(v => v !== null && v !== undefined).map(Number));
  const bank = shuffled.filter(i => !placedSet.has(i));

  const commit = (next) => onChange(next.slice());

  const placeInSlot = (optIdx, fromSlot, targetSlot) => {
    const next = placed.slice();
    const displaced = next[targetSlot];
    if (fromSlot !== undefined && fromSlot !== null) next[fromSlot] = (displaced ?? null);
    next[targetSlot] = optIdx;
    commit(next);
  };
  const clearSlot = (slot) => { const next = placed.slice(); next[slot] = null; commit(next); };

  // tap interactions
  const tapBankCard = (optIdx) =>
    setSelected(s => (s?.optIdx === optIdx && s?.from === 'bank') ? null : { optIdx, from: 'bank' });
  const tapSlot = (slot) => {
    const inSlot = placed[slot];
    if (selected) {
      placeInSlot(selected.optIdx, selected.from === 'slot' ? selected.slot : undefined, slot);
      setSelected(null);
    } else if (inSlot !== null && inSlot !== undefined) {
      setSelected({ optIdx: Number(inSlot), from: 'slot', slot });
    }
  };

  // html5 drag
  const startDrag = (e, optIdx, from, slot) => { dragRef.current = { optIdx, from, slot }; e.dataTransfer.effectAllowed = 'move'; setSelected(null); };
  const dropOnSlot = (e, slot) => {
    e.preventDefault(); setOverSlot(null);
    const src = dragRef.current; if (!src) return;
    placeInSlot(src.optIdx, src.from === 'slot' ? src.slot : undefined, slot);
    dragRef.current = null;
  };
  const dropOnBank = (e) => {
    e.preventDefault();
    const src = dragRef.current; if (src?.from === 'slot') clearSlot(src.slot);
    dragRef.current = null;
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-400 text-center font-medium">
        Drag each step into the correct order · or tap a step then tap a slot
      </p>

      {/* Numbered slots */}
      <div className="space-y-2.5">
        {placed.map((optIdx, slot) => {
          const o = optIdx !== null && optIdx !== undefined ? opts[Number(optIdx)] : null;
          const isOver = overSlot === slot;
          const isSlotSel = selected?.from === 'slot' && selected?.slot === slot;
          const canDrop = !!selected && o == null;
          return (
            <div key={slot} className="flex items-stretch gap-2.5">
              <div className="w-9 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">
                {slot + 1}
              </div>
              <div
                draggable={!!o}
                onDragStart={o ? e => startDrag(e, Number(optIdx), 'slot', slot) : undefined}
                onDragOver={e => { e.preventDefault(); setOverSlot(slot); }}
                onDragLeave={() => setOverSlot(null)}
                onDrop={e => dropOnSlot(e, slot)}
                onClick={() => tapSlot(slot)}
                className={`flex-1 rounded-xl border-2 px-3 py-3 min-h-[52px] flex items-center transition-all duration-150 select-none ${
                  o
                    ? `${isSlotSel ? 'border-indigo-400 bg-indigo-50' : 'border-green-300 bg-green-50'} cursor-grab active:cursor-grabbing`
                    : `border-dashed cursor-pointer ${isOver || canDrop ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-200'}`
                }`}>
                {o ? (
                  <div className="flex items-center gap-2 w-full">
                    <GripVertical size={14} className="text-slate-300 shrink-0"/>
                    {imgOf(o) && <img src={imgOf(o)} alt="" className="w-8 h-8 object-cover rounded-lg shrink-0"/>}
                    <span className={`text-sm font-semibold flex-1 ${isSlotSel ? 'text-indigo-700' : 'text-green-700'}`}>{txtOf(o)}</span>
                    <button onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); clearSlot(slot); setSelected(null); }}
                      className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 shrink-0">
                      <X size={9}/>
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs mx-auto font-medium ${isOver || canDrop ? 'text-indigo-400' : 'text-slate-300'}`}>
                    {canDrop ? 'Tap to place' : 'Drop step here'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bank */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={dropOnBank}
        className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-3 min-h-[56px]">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Steps</p>
        {bank.length === 0 ? (
          <div className="flex items-center justify-center gap-1.5 py-1 text-green-600 text-sm font-semibold">
            <CheckCircle size={14}/> All steps placed!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bank.map(optIdx => {
              const o = opts[optIdx];
              const isSel = selected?.optIdx === optIdx && selected?.from === 'bank';
              return (
                <div key={optIdx} draggable
                  onDragStart={e => startDrag(e, optIdx, 'bank', undefined)}
                  onClick={e => { e.stopPropagation(); tapBankCard(optIdx); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold cursor-grab active:cursor-grabbing select-none transition-all ${
                    isSel ? 'border-indigo-500 bg-indigo-50 text-indigo-700 scale-105 shadow-md ring-2 ring-indigo-200'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                  }`}>
                  {imgOf(o) && <img src={imgOf(o)} alt="" className="w-8 h-8 object-cover rounded-lg"/>}
                  {txtOf(o)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Categorize / Grouping Question ────────────────────────────────────────
// extras = { buckets:[name…], items:[{text,imageUrl,bucket}] }. The student drags
// each item into a bucket column. answer = { itemIndex: bucketIndex }.
function CategorizeQuestion({ q, answer, onChange }) {
  const buckets = Array.isArray(q.extras?.buckets) ? q.extras.buckets : [];
  const items   = Array.isArray(q.extras?.items)   ? q.extras.items   : [];
  const placed = answer && typeof answer === 'object' ? answer : {};
  const shuffled = useShuffledIndices(items.length);

  const [selected, setSelected] = useState(null); // itemIdx selected in bank/column
  const [overBucket, setOverBucket] = useState(null); // bucketIdx | 'bank'
  const dragRef = useRef(null);

  const bankItems = shuffled.filter(i => placed[i] === undefined && placed[String(i)] === undefined);

  const placeItem = (itemIdx, bucketIdx) => { const n = { ...placed }; n[itemIdx] = bucketIdx; onChange(n); };
  const removeItem = (itemIdx) => { const n = { ...placed }; delete n[itemIdx]; delete n[String(itemIdx)]; onChange(n); };

  const tapItem = (itemIdx) => setSelected(s => (s === itemIdx ? null : itemIdx));
  const tapBucket = (bucketIdx) => { if (selected !== null) { placeItem(selected, bucketIdx); setSelected(null); } };
  const tapBank = () => { if (selected !== null) { removeItem(selected); setSelected(null); } };

  const startDrag = (e, itemIdx) => { dragRef.current = itemIdx; e.dataTransfer.effectAllowed = 'move'; setSelected(null); };
  const dropOnBucket = (e, bucketIdx) => { e.preventDefault(); setOverBucket(null); if (dragRef.current !== null && dragRef.current !== undefined) placeItem(dragRef.current, bucketIdx); dragRef.current = null; };
  const dropOnBank = (e) => { e.preventDefault(); setOverBucket(null); if (dragRef.current !== null && dragRef.current !== undefined) removeItem(dragRef.current); dragRef.current = null; };

  // Plain render function (NOT a nested component) so the chip <div> keeps a
  // stable element type across re-renders — a nested component would remount on
  // every setState (e.g. dragOver) and cancel an in-progress HTML5 drag.
  const renderChip = (itemIdx, inBucket) => {
    const it = items[itemIdx];
    const isSel = selected === itemIdx;
    return (
      <div key={itemIdx} draggable
        onDragStart={e => startDrag(e, itemIdx)}
        onClick={e => { e.stopPropagation(); inBucket ? removeItem(itemIdx) : tapItem(itemIdx); }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-semibold cursor-grab active:cursor-grabbing select-none transition-all ${
          inBucket ? 'border-green-300 bg-green-50 text-green-700'
                   : isSel ? 'border-indigo-500 bg-indigo-50 text-indigo-700 scale-105 shadow-md ring-2 ring-indigo-200'
                           : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
        }`}>
        {imgOf(it) && <img src={imgOf(it)} alt="" className="w-7 h-7 object-cover rounded-md"/>}
        {txtOf(it)}
        {inBucket && <X size={10} className="text-green-400"/>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-400 text-center font-medium">
        Drag each item into the correct group · or tap an item then tap a group
      </p>

      {/* Buckets */}
      <div className={`grid gap-3 ${buckets.length >= 3 ? 'sm:grid-cols-3 grid-cols-1' : 'sm:grid-cols-2 grid-cols-1'}`}>
        {buckets.map((b, bi) => {
          const inThis = Object.keys(placed).filter(k => Number(placed[k]) === bi).map(Number);
          const isOver = overBucket === bi;
          const canDrop = selected !== null;
          return (
            <div key={bi}
              onDragOver={e => { e.preventDefault(); setOverBucket(bi); }}
              onDragLeave={() => setOverBucket(null)}
              onDrop={e => dropOnBucket(e, bi)}
              onClick={() => tapBucket(bi)}
              className={`rounded-2xl border-2 p-3 min-h-[96px] transition-all ${
                isOver || canDrop ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200 bg-slate-50/50'
              }`}>
              <p className="text-[11px] font-bold text-slate-600 mb-2 text-center">{b}</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {inThis.length === 0
                  ? <span className="text-[10px] text-slate-300 py-2">Drop items here</span>
                  : inThis.map(ii => renderChip(ii, true))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bank */}
      <div
        onDragOver={e => { e.preventDefault(); setOverBucket('bank'); }}
        onDragLeave={() => setOverBucket(null)}
        onDrop={dropOnBank}
        onClick={tapBank}
        className={`rounded-2xl border-2 p-3 min-h-[56px] transition-all ${
          overBucket === 'bank' ? 'border-indigo-400 bg-indigo-50' : 'border-dashed border-slate-200 bg-slate-50/60'
        }`}>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Items</p>
        {bankItems.length === 0 ? (
          <div className="flex items-center justify-center gap-1.5 py-1 text-green-600 text-sm font-semibold">
            <CheckCircle size={14}/> All items grouped!
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {bankItems.map(ii => renderChip(ii, false))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Image Hotspot Labeling Question ───────────────────────────────────────
// q.imageUrl is the picture; extras.hotspots = [{x,y,label}] (x,y in %). The
// student drags labels onto the marked spots. answer = { hotspotIdx: labelIdx }.
function HotspotLabelQuestion({ q, answer, onChange }) {
  const hotspots = Array.isArray(q.extras?.hotspots) ? q.extras.hotspots : [];
  const labels = hotspots.map(h => h?.label || '');
  const shuffled = useShuffledIndices(labels.length);
  const placed = answer && typeof answer === 'object' ? answer : {};

  const [selected, setSelected] = useState(null); // labelIdx
  const [overSpot, setOverSpot] = useState(null);
  const dragRef = useRef(null);

  const usedLabels = new Set(Object.values(placed).map(Number));
  const bank = shuffled.filter(li => !usedLabels.has(li));

  const placeLabel = (labelIdx, spotIdx) => {
    const n = { ...placed };
    // a label can only be in one spot — remove it from any other spot first
    Object.keys(n).forEach(k => { if (Number(n[k]) === labelIdx) delete n[k]; });
    n[spotIdx] = labelIdx;
    onChange(n);
  };
  const clearSpot = (spotIdx) => { const n = { ...placed }; delete n[spotIdx]; delete n[String(spotIdx)]; onChange(n); };

  const tapLabel = (labelIdx) => setSelected(s => (s === labelIdx ? null : labelIdx));
  const tapSpot = (spotIdx) => {
    const cur = placed[spotIdx] ?? placed[String(spotIdx)];
    if (selected !== null) { placeLabel(selected, spotIdx); setSelected(null); }
    else if (cur !== undefined) { clearSpot(spotIdx); }
  };

  const startDrag = (e, labelIdx) => { dragRef.current = labelIdx; e.dataTransfer.effectAllowed = 'move'; setSelected(null); };
  const dropOnSpot = (e, spotIdx) => { e.preventDefault(); setOverSpot(null); if (dragRef.current !== null && dragRef.current !== undefined) placeLabel(dragRef.current, spotIdx); dragRef.current = null; };

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-slate-400 text-center font-medium">
        Drag each label onto the matching spot · or tap a label then tap a spot
      </p>

      {/* Image with hotspots */}
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50 select-none">
        {q.imageUrl
          ? <img src={q.imageUrl} alt="Labelled diagram" className="w-full max-h-[340px] object-contain pointer-events-none"/>
          : <div className="h-40 flex items-center justify-center text-slate-300 text-sm">No image</div>}
        {hotspots.map((h, si) => {
          const lab = placed[si] ?? placed[String(si)];
          const hasLabel = lab !== undefined;
          const isOver = overSpot === si;
          return (
            <div key={si}
              onDragOver={e => { e.preventDefault(); setOverSpot(si); }}
              onDragLeave={() => setOverSpot(null)}
              onDrop={e => dropOnSpot(e, si)}
              onClick={() => tapSpot(si)}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer">
              {hasLabel ? (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500 text-white text-[11px] font-bold shadow-lg whitespace-nowrap">
                  {txtOf(labels[Number(lab)])}
                  <X size={9} className="opacity-80"/>
                </span>
              ) : (
                <span className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-[11px] font-bold shadow-md transition-all ${
                  isOver || selected !== null ? 'border-indigo-500 bg-indigo-500 text-white scale-110' : 'border-white bg-slate-700/80 text-white'
                }`}>
                  {si + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Labels bank */}
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Labels</p>
        <div className="flex flex-wrap gap-2">
          {bank.length === 0 ? (
            <div className="flex items-center justify-center gap-1.5 py-1 text-green-600 text-sm font-semibold w-full">
              <CheckCircle size={14}/> All labels placed!
            </div>
          ) : bank.map(li => {
            const isSel = selected === li;
            return (
              <div key={li} draggable
                onDragStart={e => startDrag(e, li)}
                onClick={() => tapLabel(li)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-semibold cursor-grab active:cursor-grabbing select-none transition-all ${
                  isSel ? 'border-indigo-500 bg-indigo-50 text-indigo-700 scale-105 shadow-md ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
                }`}>
                {labels[li]}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// True when a question's answer is fully correct (all-or-nothing for the
// drag-and-drop types, exact match for single-answer types).
function isQuestionCorrect(q, answer) {
  if (answer === undefined || answer === null) return false;
  switch (q.type) {
    case 'match':      return isMatchAllCorrect(q.pairs, answer);
    case 'order':      return isOrderAllCorrect(q.options, answer);
    case 'categorize': return isCategorizeAllCorrect(q.extras, answer);
    case 'hotspot':    return isHotspotAllCorrect(q.extras, answer);
    default:           return answer === q.correct;
  }
}

function isAnswered(q, answer) {
  if (answer === undefined || answer === null) return false;
  switch (q.type) {
    case 'match':
      return typeof answer === 'object' && Object.keys(answer).length === (q.pairs?.length || 0);
    case 'order':
      return Array.isArray(answer) && answer.length === (q.options?.length || 0) &&
        answer.every(v => v !== null && v !== undefined);
    case 'categorize':
      return typeof answer === 'object' && Object.keys(answer).length === (q.extras?.items?.length || 0);
    case 'hotspot':
      return typeof answer === 'object' && Object.keys(answer).length === (q.extras?.hotspots?.length || 0);
    default:
      return answer !== undefined;
  }
}

export default function LevelQuiz() {
  const { levelId }  = useParams();
  const id           = Number(levelId);
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { getLevelStatus, markLevelComplete, levelSettings, levelSettingsLoaded, refreshLevelSettings } = useLevel();
  const { colors }   = useTheme();
  const { quizTimerMinutes } = useSettings();

  const QUIZ_FALLBACK_COLORS = [
    { from: '#f59e0b', to: '#d97706' },
    { from: '#ec4899', to: '#db2777' },
    { from: '#14b8a6', to: '#0d9488' },
    { from: '#6366f1', to: '#4f46e5' },
  ];
  const staticLevel = LEVELS.find(l => l.id === id);
  const dbLevel     = levelSettings[id];
  const level       = staticLevel ?? (dbLevel ? {
    id,
    title:    dbLevel.title    || `Level ${id}`,
    subtitle: dbLevel.subtitle || '',
    color:    QUIZ_FALLBACK_COLORS[(id - 1) % QUIZ_FALLBACK_COLORS.length],
  } : null);

  const status = getLevelStatus(user?.id, id);

  // ── All state declarations must come before any useEffect ───────────────────
  const [questions,       setQuestions]       = useState([]);
  const [loading,         setLoading]         = useState(true);
  // Initialize quizStarted=true immediately if a valid session exists (prevents redirect on refresh)
  const [quizStarted,     setQuizStarted]     = useState(() => {
    if (!user?.id) return false;
    try {
      const key   = `rqa_quiz_${id}_${user.id}`;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const { expiresAt } = JSON.parse(saved);
        return (expiresAt - Date.now()) / 1000 > 0;
      }
    } catch { /* ignore corrupt session storage */ }
    return false;
  });
  const [current,         setCurrent]         = useState(0);
  const [answers,         setAnswers]         = useState({});
  const [panelFilter,     setPanelFilter]     = useState('all');
  const [timeLeft,        setTimeLeft]        = useState(null);
  const [timesUp,         setTimesUp]         = useState(false);
  const [showSubmit,      setShowSubmit]      = useState(false);
  const [result,          setResult]          = useState(null);
  const [saveError,       setSaveError]       = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [showMobilePanel,      setShowMobilePanel]      = useState(false);
  const [showReview,           setShowReview]           = useState(false);
  const [insufficientWarning,  setInsufficientWarning]  = useState('');
  const [showBackWarning,      setShowBackWarning]      = useState(false);
  const [showTabWarning,       setShowTabWarning]       = useState(false);
  const [noAttemptsError,      setNoAttemptsError]      = useState(null);
  const [insufficientError,    setInsufficientError]    = useState(null);

  const quizDuration  = useRef(600);
  const submittingRef = useRef(false);

  // Session key for timer/answer persistence across refresh and back navigation
  const sessionKey = user?.id ? `rqa_quiz_${id}_${user.id}` : null;

  // ── Navigation guard ────────────────────────────────────────────────────────
  const quizInProgress = quizStarted && !result && !isSubmitting;

  // Redirect if locked or already completed (but not after submitting in this session)
  useEffect(() => {
    // If an active quiz session exists in sessionStorage, the student refreshed mid-quiz.
    // Skip redirect — the async session restore will set quizStarted=true.
    if (sessionKey) {
      try {
        const saved = sessionStorage.getItem(sessionKey);
        if (saved) {
          const { expiresAt } = JSON.parse(saved);
          if ((expiresAt - Date.now()) / 1000 > 0) return;
        }
      } catch { /* ignore */ }
    }
    if (status === 'locked') navigate('/dashboard', { replace: true });
  }, [status, navigate, quizStarted, result, sessionKey]);

  // Refresh level settings on mount so recently-deleted levels redirect immediately
  useEffect(() => { refreshLevelSettings(); }, []);

  // Generate questions on mount — enforce admin-configured question count
  useEffect(() => {
    Promise.all([
      generateLevelQuiz(user?.id, id),
      api.getLevelSettings().catch(() => []),
    ]).then(([qs, lvls]) => {
      const lvlData = Array.isArray(lvls) ? lvls.find(l => l.id === id) : null;
      const maxQ    = Number(lvlData?.questionCount) || 0;
      const limited = maxQ > 0 ? qs.slice(0, maxQ) : qs;
      if (maxQ > 0 && qs.length < maxQ && qs.length > 0) {
        setInsufficientWarning(
          `Only ${qs.length} of ${maxQ} configured questions are available in the Question Bank for this level.`
        );
      }
      setQuestions(limited.map(q => {
        if (q.type === 'truefalse') return { ...q, type: 'tf' };
        if (q.type === 'image')     return { ...q, type: 'label' };
        return q;
      }));

      // Restore in-progress session (survives refresh and back navigation)
      if (sessionKey) {
        try {
          const saved = sessionStorage.getItem(sessionKey);
          if (saved) {
            const { expiresAt, duration, answers: sa, current: sc } = JSON.parse(saved);
            const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
            if (remaining > 0) {
              quizDuration.current = duration;
              setAnswers(sa || {});
              setCurrent(sc || 0);
              setTimeLeft(remaining);
              setQuizStarted(true);
            } else {
              sessionStorage.removeItem(sessionKey);
            }
          }
        } catch { /* ignore corrupt session */ }
      }

      setLoading(false);
    }).catch(err => {
      if (err?.status === 403) {
        setNoAttemptsError(err.message || 'You have used all attempts for this level.');
      } else if (err?.status === 422) {
        setInsufficientError(err.message || 'Insufficient questions available for this level. Please contact the administrator.');
      }
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep sessionStorage in sync — runs on every timer tick AND answer/navigation change
  useEffect(() => {
    if (!quizStarted || !sessionKey || result) return;
    try {
      const existing = sessionStorage.getItem(sessionKey);
      if (existing) {
        const data = JSON.parse(existing);
        sessionStorage.setItem(sessionKey, JSON.stringify({ ...data, answers, current }));
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, current, timeLeft]);

  // Intercept browser back button — show warning instead of navigating away
  useEffect(() => {
    if (!quizInProgress) return;
    window.history.pushState(null, '', window.location.href);
    const handlePop = () => {
      window.history.pushState(null, '', window.location.href);
      setShowBackWarning(true);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [quizInProgress]);

  // Block browser refresh / tab close / OS back gesture
  useEffect(() => {
    if (!quizInProgress) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [quizInProgress]);

  // Anti-cheat guard: warn (auto-submit / stay) when the student switches to
  // another tab/window, copies the question, or *attempts* to open a new
  // tab/window (Ctrl/Cmd+T/N, right-click → "Open in new tab"). Copying and the
  // shortcuts/context-menu are blocked where the browser allows, and every
  // action raises the same warning modal — shown BEFORE the tab is left.
  useEffect(() => {
    if (!quizInProgress) return;
    const onVisibility = () => { if (document.hidden) setShowTabWarning(true); };
    const onBlur       = () => setShowTabWarning(true);
    const onCopy       = (e) => { e.preventDefault(); setShowTabWarning(true); };
    const onContext    = (e) => { e.preventDefault(); setShowTabWarning(true); };
    // Catch new-tab / new-window shortcuts on keydown, before the action fires.
    const onKeyDown = (e) => {
      const key = (e.key || '').toLowerCase();
      const combo = e.ctrlKey || e.metaKey;
      // Ctrl/Cmd+T (new tab), +N (new window), +Shift+N (incognito),
      // +Shift+T (reopen closed tab). Ctrl-click a link also opens a new tab.
      if ((combo && ['t', 'n'].includes(key)) || (combo && (e.button === 1))) {
        e.preventDefault();
        setShowTabWarning(true);
      }
    };
    // Ctrl/Cmd + click (middle-click) on a link opens a new tab.
    const onAuxClick = (e) => {
      if (e.button === 1 || e.ctrlKey || e.metaKey) { e.preventDefault(); setShowTabWarning(true); }
    };
    // Exit-intent: the browser's "+" / tab bar / address bar sit ABOVE the page.
    // When the cursor leaves the viewport through the top edge, the student is
    // heading for a new tab — warn BEFORE they get there.
    const onMouseOut = (e) => {
      if (!e.relatedTarget && !e.toElement && e.clientY <= 0) setShowTabWarning(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCopy);
    document.addEventListener('contextmenu', onContext);
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('auxclick', onAuxClick, true);
    document.addEventListener('mouseout', onMouseOut);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCopy);
      document.removeEventListener('contextmenu', onContext);
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('auxclick', onAuxClick, true);
      document.removeEventListener('mouseout', onMouseOut);
    };
  }, [quizInProgress]);

  // Initialize timer from API-backed levelSettings once questions finish loading
  // Skip if a session is being restored (session restore sets timeLeft directly)
  useEffect(() => {
    if (!loading && timeLeft === null) {
      if (sessionKey && sessionStorage.getItem(sessionKey)) return; // session restore pending
      const mins = Number(levelSettings[id]?.timeLimit);
      const dur = mins > 0 ? mins * 60 : 600;
      quizDuration.current = dur;
      setTimeLeft(dur);
    }
  }, [loading, levelSettings, id, timeLeft, sessionKey]);

  const computeScore = useCallback(() => {
    let correct = 0, wrong = 0;
    questions.forEach(q => {
      const ans = answers[q.id];
      if (ans === undefined || ans === null) return;
      if (isQuestionCorrect(q, ans)) correct++;
      else wrong++;
    });
    const total = questions.length;
    const pct   = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, wrong, total, pct, timeTaken: quizDuration.current - (timeLeft ?? 0) };
  }, [answers, questions, timeLeft]);

  // Countdown — only runs after student clicks "Start Exam" on the rules screen
  useEffect(() => {
    if (!quizStarted || timesUp || timeLeft === null || timeLeft <= 0 || result) return;
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [quizStarted, timesUp, timeLeft, result]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && !timesUp) setTimesUp(true);
  }, [timeLeft, timesUp]);

  useEffect(() => {
    if (!timesUp || result) return;
    const t = setTimeout(() => doSubmit(true), 2500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timesUp]);

  useEffect(() => {
    const t = setTimeout(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }, 600);
    return () => clearTimeout(t);
  }, [answers]);

  // Retry a promise-returning function with exponential backoff.
  // Render free-tier can cold-start in 30–50 s; the api.js timeout is 55 s.
  // Three retries with 3 s / 8 s / 15 s gaps give the server time to warm up.
  // 4xx errors are NOT retried — they are server-side validation rejections and
  // will never recover with a retry (e.g. routing bugs, missing fields).
  const withRetry = async (fn, retries = 3) => {
    const delays = [3000, 8000, 15000];
    let lastErr;
    for (let i = 0; i <= retries; i++) {
      try { return await fn(); } catch (err) {
        lastErr = err;
        if (err?.status >= 400 && err?.status < 500) throw err;
        if (i < retries) await new Promise(r => setTimeout(r, delays[i] ?? 15000));
      }
    }
    throw lastErr;
  };

  const doSubmit = async (auto = false) => {
    // Hard lock — prevents duplicate submissions even with concurrent clicks
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    if (sessionKey) sessionStorage.removeItem(sessionKey);

    const score = computeScore();

    // Persist questions for review. Strip ONLY base64 data: URIs (they overflow the
    // localStorage recovery buffer and bloat the payload); keep S3/https image URLs
    // so image-based questions, options and match pairs still render in Quiz History.
    const keepImg = (url) => {
      const u = (url || '').toString();
      return u.startsWith('data:') ? '' : u;
    };
    const compactQ = (q) => ({
      id:          q.id,
      category:    q.category,
      type:        q.type,
      text:        q.text || '',
      imageUrl:    keepImg(q.imageUrl),
      options:     (Array.isArray(q.options) ? q.options : []).map(o =>
                     typeof o === 'string'
                       ? { text: o, imageUrl: '' }
                       : { text: o?.text || '', imageUrl: keepImg(o?.imageUrl) }),
      correct:     q.correct,
      pairs:       q.pairs?.map(p => ({
                     left:       p.left  || '',
                     right:      p.right || '',
                     leftImage:  keepImg(p.leftImage),
                     rightImage: keepImg(p.rightImage),
                   })),
      // Keep type-specific structure for 'categorize' / 'hotspot' review, with
      // base64 images stripped (same rule as options/pairs above).
      extras:      q.extras ? {
                     ...(Array.isArray(q.extras.buckets) ? { buckets: q.extras.buckets } : {}),
                     ...(Array.isArray(q.extras.items) ? { items: q.extras.items.map(it => ({
                       text: it?.text || '', imageUrl: keepImg(it?.imageUrl), bucket: it?.bucket,
                     })) } : {}),
                     ...(Array.isArray(q.extras.hotspots) ? { hotspots: q.extras.hotspots.map(h => ({
                       x: h?.x, y: h?.y, label: h?.label || '',
                     })) } : {}),
                   } : undefined,
      explanation: q.explanation || '',
    });

    const attemptData = {
      levelId:    id,
      levelTitle: level?.title || `Level ${id}`,
      date:       new Date().toISOString(),
      // Unique per submission, generated once and reused across every retry below.
      // The backend dedupes on this so genuine retakes are always saved, while a
      // retried (timed-out) POST never creates a duplicate.
      clientAttemptId: (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${user.id}-${id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      questions:  questions.map(compactQ),
      answers:    { ...answers },
      score,
    };

    // Show the result screen immediately — the score is computed entirely
    // client-side, so there is no reason to make the student wait on the
    // network. The two critical writes run in the background; if either fails
    // after all retries, setSaveError(true) surfaces the warning banner that
    // the already-rendered result screen renders.
    setResult({ ...score, auto });
    setShowSubmit(false);
    // Keep isSubmitting true — exam is done, no need to re-enable the button

    // The two critical writes are retried independently so a cold-start timeout
    // on one call does not block or contaminate the other.
    // recordUsedQuestions is best-effort and never blocks the result screen.
    Promise.allSettled([
      withRetry(() => saveQuizAttempt(user.id, attemptData)),
      withRetry(() => markLevelComplete(user.id, id, score)),
      recordUsedQuestions(user.id, questions.map(q => q.id)),
    ]).then(([attemptSaved, progressSaved]) => {
      if (attemptSaved.status === 'rejected' || progressSaved.status === 'rejected') {
        console.error('Save failed after retries:',
          (attemptSaved.reason || progressSaved.reason)?.message);
        setSaveError(true);
      }
    });
  };

  const goNext = () => setCurrent(c => Math.min(c + 1, questions.length - 1));
  const goBack = () => setCurrent(c => Math.max(0, c - 1));
  const handleAnswer  = (qId, val) => setAnswers(p => ({ ...p, [qId]: val }));

  const getQStatus = (idx) => {
    const q = questions[idx];
    if (!q) return 'unanswered';
    if (isAnswered(q, answers[q.id])) return 'answered';
    if (idx === current)              return 'current';
    return 'unanswered';
  };

  const isVisible = (idx) => {
    if (panelFilter === 'all') return true;
    const q = questions[idx];
    return panelFilter === 'answered'
      ? isAnswered(q, answers[q.id])
      : !isAnswered(q, answers[q.id]);
  };

  const q        = questions[current];
  const answered = questions.filter(q => isAnswered(q, answers[q.id])).length;
  const tState   = timerState(timeLeft);
  const isLast   = current === questions.length - 1;

  const timerStyle = {
    normal:   { bg: 'bg-slate-50',  text: 'text-slate-800', icon: 'text-slate-400'  },
    warning:  { bg: 'bg-orange-50', text: 'text-orange-600',icon: 'text-orange-400' },
    critical: { bg: 'bg-red-50',    text: 'text-red-600',   icon: 'text-red-500'    },
  }[tState];

  // Loading guard — wait for both questions and timer to initialize
  if (loading || (timeLeft === null && !noAttemptsError && !insufficientError)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading quiz…</p>
        </div>
      </div>
    );
  }

  // Insufficient questions in the mapped Question Bank level (422 from generation)
  if (insufficientError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">Exam Unavailable</h2>
          <p className="text-slate-500 text-sm mb-6">{insufficientError}</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // No attempts remaining guard (403 from quiz generation)
  if (noAttemptsError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <Trophy size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Attempts Remaining</h2>
          <p className="text-slate-500 text-sm mb-6">{noAttemptsError}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm">
              Back to Dashboard
            </button>
            <button onClick={() => navigate('/quiz-history')}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
              Quiz History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No questions guard
  if (!questions.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
          <Shuffle size={40} className="text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Questions Available</h2>
          <p className="text-slate-500 text-sm mb-6">The admin hasn't added any questions for this level yet.</p>
          <button onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!level) {
    if (!levelSettingsLoaded) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center">
            <div className="w-10 h-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading…</p>
          </div>
        </div>
      );
    }
    navigate('/dashboard', { replace: true });
    return null;
  }

  /* ── Rules & Regulations screen (shown before exam starts) ──────── */
  if (!quizStarted && !result) {
    const examRules = [
      'Read each question carefully before selecting your answer.',
      'You can navigate between questions using the question panel.',
      'Answers are auto-saved as you proceed.',
      'The timer starts when you click "Start Exam" and cannot be paused.',
      'You can review and change answers before final submission.',
      'Once submitted, answers cannot be changed.',
      'Do not refresh or close the browser tab during the exam.',
      'Attempts per level are limited — check your dashboard for remaining attempts.',
    ];
    // Honour the level's own timer; otherwise fall back to the admin's global
    // Default Quiz Timer (not a hardcoded 10). A non-positive/negative level value
    // is treated as unset so it can never yield a negative timer.
    const levelTime = Number(levelSettings[id]?.timeLimit);
    const timeLimit = levelTime > 0 ? levelTime : quizTimerMinutes;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden">
          {/* Coloured header */}
          <div className="relative p-6 text-white overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-[40px] bg-white" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen size={28} />
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Rules & Regulations</p>
                <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>{level.title}</h2>
                <p className="text-white/80 text-sm">{level.subtitle}</p>
              </div>
            </div>
            <div className="relative z-10 grid grid-cols-2 gap-3 mt-4">
              {[
                { label: 'Questions', value: `${Number(levelSettings[id]?.questionCount) || questions.length} Qs` },
                { label: 'Time Limit', value: `${timeLimit} Min` },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <p className="text-white/70 text-xs">{m.label}</p>
                  <p className="text-white font-bold">{m.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Insufficient questions warning */}
            {insufficientWarning && (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <AlertTriangle size={15} className="text-orange-500 shrink-0 mt-0.5"/>
                <p className="text-sm font-semibold text-orange-700">{insufficientWarning}</p>
              </div>
            )}

            {/* Rules list */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle size={15} className="text-amber-500" /> Instructions
              </h3>
              <ul className="space-y-2">
                {examRules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                      style={{ background: level.color.from }}>
                      {i + 1}
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button onClick={() => navigate('/dashboard')}
                className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (sessionKey) {
                    try {
                      sessionStorage.setItem(sessionKey, JSON.stringify({
                        expiresAt: Date.now() + quizDuration.current * 1000,
                        duration:  quizDuration.current,
                        answers:   {},
                        current:   0,
                      }));
                    } catch { /* ignore */ }
                  }
                  setQuizStarted(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                  boxShadow: `0 4px 16px ${level.color.from}40`,
                }}>
                Start Exam <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!level || !q) return null;

  /* ── Result screen ─────────────────────────────────────────────── */
  if (result) {
    const perf = result.pct >= 90 ? { text: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Excellent!' }
      : result.pct >= 70 ? { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Good Job!' }
      : result.pct >= 40 ? { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Keep Going!' }
      : { text: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Keep Practising' };
    const sc = perf;

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Gradient header */}
        <div className="relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 blur-[60px] bg-white" />
          <div className="relative z-10 text-center text-white px-6 pt-8 pb-6">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Trophy size={26} />
            </div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>
              {level.title} Complete!
            </h2>
            <p className="text-white/70 text-sm mt-1">{questions.length} Questions · {CATEGORIES.length} Categories</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* Save-error warning — only shown if progress failed to persist */}
          {saveError && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
              style={{ background: '#fef9c3', border: '1px solid #fde047' }}>
              <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
              <span className="text-yellow-800">
                Your score has been recorded locally, but we could not save your progress to the server right now.
                Please stay on this page or contact your teacher if this message persists after refreshing.
              </span>
            </div>
          )}

          {/* Score */}
          <div className="bg-white rounded-2xl shadow-sm p-5 text-center"
            style={{ border: `1.5px solid ${sc.border}` }}>
            <p className="text-5xl font-bold" style={{ color: sc.text, fontFamily: 'Space Grotesk' }}>
              {result.pct}%
            </p>
            <p className="font-bold text-sm mt-1" style={{ color: sc.text }}>{sc.label}</p>
          </div>

          {/* Correct / Wrong / Skipped */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Correct', value: result.correct, color: '#16a34a', bg: '#f0fdf4' },
              { label: 'Wrong',   value: result.wrong,   color: '#dc2626', bg: '#fef2f2' },
              { label: 'Skipped', value: result.total - result.correct - result.wrong, color: '#64748b', bg: '#f8fafc' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm" style={{ background: s.bg }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
              Dashboard
            </button>
            <button onClick={() => navigate('/quiz-history')}
              className="flex-1 py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02]"
              style={{
                background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                boxShadow: `0 4px 14px ${level.color.from}40`,
              }}>
              Quiz History
            </button>
          </div>

          {/* Inline answer review */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowReview(r => !r)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-500" />
                <span className="font-bold text-slate-800 text-sm">Review My Answers</span>
                <span className="text-xs text-slate-400">({questions.length} questions)</span>
              </div>
              {showReview
                ? <ChevronUp size={16} className="text-slate-400" />
                : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {showReview && (
              <div className="border-t border-slate-100 p-4 space-y-3">
                {/* Color key */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 pb-1">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300 inline-block"/> Correct</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"/> Wrong</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block"/> Skipped</span>
                </div>
                {questions.map((q, i) => {
                  const ans = answers[q.id] ?? answers[String(q.id)] ?? answers[Number(q.id)];
                  return (
                    <ResultQuestionCard
                      key={q.id || i}
                      q={q}
                      answer={ans}
                      index={i + 1}
                      levelColor={level.color}
                    />
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  /* ── Quiz screen ───────────────────────────────────────────────── */
  const catMeta = CATEGORY_META[q.category] || { label: q.category, color: colors.primary };
  const typeLabel = q.type === 'match' ? 'Match the Following'
    : q.type === 'label' ? 'Label Question'
    : q.type === 'order' ? 'Arrange in Order'
    : q.type === 'categorize' ? 'Group into Categories'
    : q.type === 'hotspot' ? 'Label the Image'
    : q.type === 'tf' ? 'True / False'
    : 'Multiple Choice';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {timesUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-sm mx-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Time's Up!</h2>
            <p className="text-slate-500 text-sm">Submitting your quiz automatically…</p>
          </div>
        </div>
      )}

      {showBackWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm mx-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Leave the Exam?</h2>
            <p className="text-slate-500 text-sm text-center mb-6">
              You have already started this exam. If you leave, your quiz will be submitted automatically with your answers so far — and you cannot restart this exam.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBackWarning(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                Stay in Exam
              </button>
              <button
                onClick={() => { setShowBackWarning(false); doSubmit(true); }}
                className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-100 transition-all">
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showTabWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm mx-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Stay on the Exam</h2>
            <p className="text-slate-500 text-sm text-center mb-6">
              Switching tabs or copying question content is not allowed during the exam. If you continue, your quiz will be submitted automatically with your answers so far — and you cannot restart this exam.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTabWarning(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all">
                Stay in Exam
              </button>
              <button
                onClick={() => { setShowTabWarning(false); doSubmit(true); }}
                className="flex-1 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 font-semibold text-sm hover:bg-red-100 transition-all">
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm px-4 md:px-6 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: level.color.from }} />
          <p className="font-bold text-slate-800 text-sm truncate">{level.title} — {level.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle size={12} /> Saved
            </span>
          )}
          <div className={`flex items-center gap-1.5 font-bold text-base px-3 py-1.5 rounded-xl ${timerStyle.bg} ${timerStyle.text} ${tState === 'critical' ? 'animate-pulse' : ''}`}>
            <Clock size={15} className={timerStyle.icon} />
            <span className="font-mono tabular-nums">{formatDuration(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-100 px-4 md:px-6 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Q {current + 1} / {questions.length}</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${(answered / questions.length) * 100}%`,
                background: `linear-gradient(90deg, ${level.color.from}, ${level.color.to})` }} />
          </div>
          <span className="text-[11px] font-semibold shrink-0" style={{ color: level.color.from }}>
            {answered} answered
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Question area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-2xl mx-auto space-y-5">

            {/* Question card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: `${catMeta.color}15`, color: catMeta.color }}>
                    {catMeta.label}
                  </span>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: `${level.color.from}15`, color: level.color.from }}>
                    Q{current + 1}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {typeLabel}
                </span>
              </div>

              {/* Question image (all types except hotspot, which renders its own
                  image with the drop markers overlaid) */}
              {q.imageUrl && q.type !== 'hotspot' && (
                <div className="mb-4 rounded-xl overflow-hidden border border-slate-200">
                  <img src={q.imageUrl} alt="Question visual" className="w-full max-h-56 object-contain bg-slate-50" />
                </div>
              )}

              <div className="flex items-start gap-3 mb-6">
                <span className="w-8 h-8 rounded-lg text-white text-sm font-bold flex items-center justify-center shrink-0"
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
                  {current + 1}
                </span>
                {q.text && <p className="text-slate-800 font-semibold leading-relaxed text-base">{q.text}</p>}
              </div>

              {/* Match type — drag-and-drop */}
              {q.type === 'match' && (
                <DragMatchQuestion
                  q={q}
                  answer={answers[q.id]}
                  onChange={val => handleAnswer(q.id, val)}
                  levelColor={level.color}
                />
              )}

              {/* Label type — drag-and-drop */}
              {q.type === 'label' && (
                <DragLabelQuestion
                  q={q}
                  answer={answers[q.id]}
                  onChange={val => handleAnswer(q.id, val)}
                  levelColor={level.color}
                />
              )}

              {/* Ordering / Sequencing */}
              {q.type === 'order' && (
                <OrderingQuestion q={q} answer={answers[q.id]} onChange={val => handleAnswer(q.id, val)} />
              )}

              {/* Categorize / Grouping */}
              {q.type === 'categorize' && (
                <CategorizeQuestion q={q} answer={answers[q.id]} onChange={val => handleAnswer(q.id, val)} />
              )}

              {/* Image hotspot labeling */}
              {q.type === 'hotspot' && (
                <HotspotLabelQuestion q={q} answer={answers[q.id]} onChange={val => handleAnswer(q.id, val)} />
              )}

              {/* MCQ / True-False */}
              {(q.type === 'mcq' || q.type === 'tf') && Array.isArray(q.options) && (
                <div className={`grid gap-3 ${q.type === 'tf' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {q.options.map((opt, i) => {
                    const selected   = answers[q.id] === i;
                    const optText    = getOptText(opt);
                    const optImage   = getOptImage(opt);
                    const hasImage   = !!optImage;
                    return (
                      <button key={i} onClick={() => handleAnswer(q.id, i)}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                          selected ? 'border-transparent text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        } ${q.type === 'tf' ? 'justify-center' : ''}`}
                        style={selected ? {
                          background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                          boxShadow:  `0 4px 14px ${level.color.from}40`,
                        } : {}}>
                        {q.type !== 'tf' && (
                          <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                            selected ? 'bg-white/20 border-white/40 text-white' : 'border-slate-300 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                        )}
                        <div className={`flex items-center gap-3 flex-1 min-w-0 ${hasImage && !optText ? 'justify-center' : ''}`}>
                          {hasImage && (
                            <img src={optImage} alt={`Option ${String.fromCharCode(65+i)}`}
                              className={`object-cover rounded-lg border shrink-0 ${selected ? 'border-white/30' : 'border-slate-200'}`}
                              style={{ width: optText ? 48 : 80, height: optText ? 48 : 80 }}/>
                          )}
                          {optText && <span className={`text-sm font-semibold ${q.type === 'tf' ? 'text-base' : ''}`}>{optText}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3">
              <button onClick={goBack} disabled={current === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="flex-1 text-center text-xs text-slate-400">
                {isAnswered(q, answers[q.id]) ? (
                  <span className="font-medium flex items-center justify-center gap-1" style={{ color: level.color.from }}>
                    <CheckCircle size={13} /> Answered
                  </span>
                ) : <span>Not answered yet</span>}
              </div>

              {isLast ? (
                <button onClick={() => setShowSubmit(true)} disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#10B981,#059669)', boxShadow: '0 4px 14px #10B98150' }}>
                  Finish <CheckCircle size={16} />
                </button>
              ) : (
                <button onClick={goNext}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-all hover:scale-[1.02]"
                  style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                    boxShadow: `0 4px 14px ${level.color.from}40` }}>
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="hidden md:flex flex-col w-[220px] bg-white border-l border-slate-100 p-4 shrink-0 overflow-y-auto">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Questions</p>

          <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-3">
            {[{ key:'all', label:'All' }, { key:'answered', label:'Done' }, { key:'unanswered', label:'Pending' }].map(tab => (
              <button key={tab.key} onClick={() => setPanelFilter(tab.key)}
                className="flex-1 py-1.5 text-[10px] font-bold transition-all"
                style={panelFilter === tab.key
                  ? { background: level.color.from, color: '#fff' }
                  : { background: '#f8fafc', color: '#64748b' }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => {
              const st      = getQStatus(i);
              const visible = isVisible(i);
              return (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-lg text-xs font-bold transition-all ${
                    !visible          ? 'opacity-20' :
                    st === 'answered' ? 'text-white' :
                    st === 'current'  ? 'text-white ring-2' :
                    'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  style={st === 'answered' ? { background: level.color.from }
                       : st === 'current'  ? { background: level.color.to }   : {}}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {answered}<span className="text-base text-slate-400">/{questions.length}</span>
              </p>
              <p className="text-xs text-slate-400">Answered</p>
            </div>
            <button onClick={() => setShowSubmit(true)} disabled={isSubmitting}
              className="w-full text-white text-sm font-semibold py-2.5 rounded-xl transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
              {isSubmitting ? 'Submitting…' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 shadow-lg px-4 py-2.5 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xs text-slate-400 leading-none">Answered</p>
          <p className="text-sm font-bold text-slate-800">{answered}/{questions.length}</p>
        </div>
        <button
          onClick={() => setShowMobilePanel(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">
          <LayoutGrid size={14} /> Questions
        </button>
        <button
          onClick={() => setShowSubmit(true)} disabled={isSubmitting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
          {isSubmitting ? 'Saving…' : 'Submit'}
        </button>
      </div>

      {/* Mobile questions slide-up panel */}
      {showMobilePanel && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMobilePanel(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-slate-800">Questions</p>
              <button onClick={() => setShowMobilePanel(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            <div className="flex rounded-xl overflow-hidden border border-slate-200 mb-4">
              {[{ key:'all', label:'All' }, { key:'answered', label:'Done' }, { key:'unanswered', label:'Pending' }].map(tab => (
                <button key={tab.key} onClick={() => setPanelFilter(tab.key)}
                  className="flex-1 py-2 text-xs font-bold transition-all"
                  style={panelFilter === tab.key
                    ? { background: level.color.from, color: '#fff' }
                    : { background: '#f8fafc', color: '#64748b' }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2 mb-5">
              {questions.map((_, i) => {
                const st      = getQStatus(i);
                const visible = isVisible(i);
                return (
                  <button key={i}
                    onClick={() => { setCurrent(i); setShowMobilePanel(false); }}
                    className={`aspect-square rounded-xl text-sm font-bold transition-all ${
                      !visible          ? 'opacity-20' :
                      st === 'answered' ? 'text-white' :
                      st === 'current'  ? 'text-white ring-2' :
                      'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    style={st === 'answered' ? { background: level.color.from }
                         : st === 'current'  ? { background: level.color.to }   : {}}>
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <div className="text-center flex-1">
                <p className="text-2xl font-bold text-slate-800">
                  {answered}<span className="text-base text-slate-400">/{questions.length}</span>
                </p>
                <p className="text-xs text-slate-400">Answered</p>
              </div>
              <button
                onClick={() => { setShowMobilePanel(false); setShowSubmit(true); }}
                disabled={isSubmitting}
                className="flex-[2] text-white text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
                {isSubmitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit modal */}
      <Modal isOpen={showSubmit} onClose={() => setShowSubmit(false)} title="Submit Quiz?"
        footer={<>
          <Button variant="secondary" disabled={isSubmitting} onClick={() => { setCurrent(0); setShowSubmit(false); }}>Review Answers</Button>
          <Button variant="success" loading={isSubmitting} disabled={isSubmitting} onClick={() => doSubmit(false)} icon={<CheckCircle size={15} />}>
            {isSubmitting ? 'Submitting…' : 'Confirm Submit'}
          </Button>
        </>}>
        <div className="space-y-4">
          <div className="rounded-2xl p-4 text-center"
            style={{ background: `${level.color.from}10`, border: `1px solid ${level.color.from}25` }}>
            <p className="text-base font-bold text-slate-800">Are you sure you want to submit?</p>
            <p className="text-sm text-slate-400 mt-1">
              Time remaining: <span className={`font-semibold ${timerStyle.text}`}>{formatDuration(timeLeft)}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xl font-bold text-green-700">{answered}</p>
              <p className="text-xs text-green-600">Answered</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xl font-bold text-slate-600">{questions.length - answered}</p>
              <p className="text-xs text-slate-500">Not Answered</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

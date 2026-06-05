import { CheckCircle, XCircle } from 'lucide-react';
import {
  orderPlacedIndex, isOrderSlotCorrect,
  categorizePlacedBucket, isCategorizeItemCorrect,
  hotspotPlacedLabel, isHotspotSpotCorrect,
} from '../../utils/helpers';

const txt = (o) => (typeof o === 'string' ? o : o?.text || '');
const img = (o) => (typeof o === 'string' ? '' : o?.imageUrl || '');

function Row({ correct, answered, children }) {
  const cls = !answered ? 'border-slate-200 bg-slate-50'
    : correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50';
  return (
    <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${cls}`}>
      {children}
      {answered && (correct
        ? <CheckCircle size={11} className="text-green-500 shrink-0"/>
        : <XCircle size={11} className="text-red-500 shrink-0"/>)}
    </div>
  );
}

// Read-only review of the drag-and-drop question types ('order' | 'categorize' |
// 'hotspot'). Returns null for any other type so callers can render it
// unconditionally alongside their own mcq/match review.
export default function DragDropReview({ q, answer }) {
  // ── Ordering ──────────────────────────────────────────────────────────────
  if (q.type === 'order') {
    const opts = Array.isArray(q.options) ? q.options : [];
    return (
      <div className="space-y-1.5">
        {opts.map((_, slot) => {
          const placedIdx = orderPlacedIndex(answer, slot);
          const placedOpt = placedIdx !== undefined ? opts[placedIdx] : null;
          const correct = isOrderSlotCorrect(answer, slot);
          const answered = placedIdx !== undefined;
          return (
            <Row key={slot} correct={correct} answered={answered}>
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{slot + 1}</span>
              <span className={`flex-1 font-semibold ${!answered ? 'text-slate-400 italic' : correct ? 'text-green-700' : 'text-red-700'}`}>
                {placedOpt ? txt(placedOpt) : 'Not placed'}
              </span>
              {answered && !correct && (
                <span className="text-green-700 font-normal shrink-0">correct: {txt(opts[slot])}</span>
              )}
            </Row>
          );
        })}
      </div>
    );
  }

  // ── Categorize ────────────────────────────────────────────────────────────
  if (q.type === 'categorize') {
    const buckets = Array.isArray(q.extras?.buckets) ? q.extras.buckets : [];
    const items   = Array.isArray(q.extras?.items)   ? q.extras.items   : [];
    return (
      <div className="space-y-1.5">
        {items.map((it, i) => {
          const placedBucket = categorizePlacedBucket(answer, i);
          const correct = isCategorizeItemCorrect(q.extras, answer, i);
          const answered = placedBucket !== undefined;
          return (
            <Row key={i} correct={correct} answered={answered}>
              <span className="flex-1 flex items-center gap-1.5 font-medium text-slate-700">
                {img(it) && <img src={img(it)} alt="" className="w-7 h-7 object-cover rounded-md border border-slate-200 shrink-0"/>}
                {txt(it)}
              </span>
              <span className="text-slate-400 shrink-0">→</span>
              <span className={`flex-1 font-semibold ${!answered ? 'text-slate-400 italic' : correct ? 'text-green-700' : 'text-red-700'}`}>
                {answered ? (buckets[placedBucket] ?? '?') : 'Not placed'}
                {answered && !correct && (
                  <span className="text-green-700 ml-1 font-normal">(correct: {buckets[Number(it.bucket)] ?? '?'})</span>
                )}
              </span>
            </Row>
          );
        })}
      </div>
    );
  }

  // ── Hotspot ───────────────────────────────────────────────────────────────
  if (q.type === 'hotspot') {
    const hotspots = Array.isArray(q.extras?.hotspots) ? q.extras.hotspots : [];
    const labels = hotspots.map(h => h?.label || '');
    return (
      <div className="space-y-1.5">
        {hotspots.map((h, i) => {
          const placedLabel = hotspotPlacedLabel(answer, i);
          const correct = isHotspotSpotCorrect(answer, i);
          const answered = placedLabel !== undefined;
          return (
            <Row key={i} correct={correct} answered={answered}>
              <span className="w-5 h-5 rounded-full bg-slate-700 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <span className={`flex-1 font-semibold ${!answered ? 'text-slate-400 italic' : correct ? 'text-green-700' : 'text-red-700'}`}>
                {answered ? labels[placedLabel] : 'Not placed'}
              </span>
              {answered && !correct && (
                <span className="text-green-700 font-normal shrink-0">correct: {labels[i]}</span>
              )}
            </Row>
          );
        })}
      </div>
    );
  }

  return null;
}

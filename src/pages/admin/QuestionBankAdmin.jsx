import { useState, useCallback, useRef } from 'react';
import {
  Plus, ChevronDown, ChevronUp, Edit2, Trash2, BookOpen,
  CheckCircle, X, Save, Eye, EyeOff, AlertTriangle, Image,
  List, AlignLeft, Layers, Tag, HelpCircle, Check,
  FolderOpen, Folder, Upload, Download, FileSpreadsheet, AlertCircle,
  ChevronRight, Database, MoreVertical, Calendar,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { loadQuestionBank, saveQuestionBank, CATEGORIES, CATEGORY_META } from '../../utils/questionBank';

// ─── Storage ──────────────────────────────────────────────────────────────
const STORAGE_KEY = 'roboquiz_qbank_multi_v1';

// Map level name → rqa_question_bank category key
const NAME_TO_CAT = Object.fromEntries(
  CATEGORIES.map(cat => [CATEGORY_META[cat].label.toLowerCase(), cat])
);
CATEGORIES.forEach(cat => { NAME_TO_CAT[cat] = cat; });

function getCatFromLevelName(name = '') {
  return NAME_TO_CAT[name.toLowerCase()] || CATEGORIES[0];
}

// ─── Data normalizers (backward-compat) ───────────────────────────────────
function normalizeOpt(opt) {
  return typeof opt === 'string' ? { text: opt, imageUrl: '' } : (opt || { text: '', imageUrl: '' });
}
function normalizePair(pair) {
  return {
    left: pair.left || '',
    leftImage: pair.leftImage || '',
    right: pair.right || '',
    rightImage: pair.rightImage || '',
  };
}

// Convert flat rqa_question_bank → hierarchical bank format used by this UI
function fromFlat(flat) {
  return {
    banks: [{
      id: 'bank-default',
      name: 'Question Bank',
      createdAt: Date.now(),
      levels: CATEGORIES.map(cat => ({
        id: `level-${cat}`,
        name: CATEGORY_META[cat].label,
        categories: [{
          id: `cat-${cat}-general`,
          name: 'General',
          questions: (flat[cat] || []).map(q => ({
            id: q.id || uid('q'),
            type: q.type || 'mcq',
            text: q.text || '',
            imageUrl: q.imageUrl || '',
            difficulty: q.difficulty || 'easy',
            options: q.options ? q.options.map(normalizeOpt) : undefined,
            correct: q.correct,
            pairs: q.pairs ? q.pairs.map(normalizePair) : undefined,
            explanation: q.explanation || '',
          })),
        }],
      })),
    }],
  };
}

// Convert hierarchical bank format → flat rqa_question_bank (synced to quiz)
function toFlat(storage) {
  const flat = Object.fromEntries(CATEGORIES.map(c => [c, []]));
  (storage.banks || []).forEach(bank => {
    (bank.levels || []).forEach(level => {
      const cat = getCatFromLevelName(level.name);
      (level.categories || []).forEach(levelCat => {
        (levelCat.questions || []).forEach(q => {
          flat[cat].push({ ...q, category: cat, status: 'active' });
        });
      });
    });
  });
  return flat;
}

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.banks?.length > 0) return parsed;
    }
  } catch {}
  try {
    const seeded = fromFlat(loadQuestionBank());
    persist(seeded);
    return seeded;
  } catch {}
  return { banks: [] };
}

function persist(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    saveQuestionBank(toFlat(data));
  } catch {}
}

let _seq = Date.now();
function uid(p = 'id') { return `${p}-${++_seq}`; }

// ─── Bank colour palette ───────────────────────────────────────────────────
const BANK_PALETTE = [
  { grad:'from-indigo-500 to-blue-600',   soft:'bg-indigo-50',   border:'border-indigo-200',  text:'text-indigo-700',   icon:'text-indigo-500'   },
  { grad:'from-violet-500 to-purple-600', soft:'bg-violet-50',   border:'border-violet-200',  text:'text-violet-700',   icon:'text-violet-500'   },
  { grad:'from-rose-500 to-pink-600',     soft:'bg-rose-50',     border:'border-rose-200',    text:'text-rose-700',     icon:'text-rose-500'     },
  { grad:'from-emerald-500 to-teal-600',  soft:'bg-emerald-50',  border:'border-emerald-200', text:'text-emerald-700',  icon:'text-emerald-500'  },
  { grad:'from-amber-500 to-orange-600',  soft:'bg-amber-50',    border:'border-amber-200',   text:'text-amber-700',    icon:'text-amber-500'    },
  { grad:'from-sky-500 to-cyan-600',      soft:'bg-sky-50',      border:'border-sky-200',     text:'text-sky-700',      icon:'text-sky-500'      },
];
const bankPal = (idx) => BANK_PALETTE[idx % BANK_PALETTE.length];

// ─── Level colour palette ──────────────────────────────────────────────────
const LEVEL_PALETTE = [
  { bg:'from-indigo-500 to-blue-500',   light:'bg-indigo-50',  border:'border-indigo-200',  text:'text-indigo-700'  },
  { bg:'from-violet-500 to-purple-500', light:'bg-violet-50',  border:'border-violet-200',  text:'text-violet-700'  },
  { bg:'from-emerald-500 to-teal-500',  light:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-700' },
  { bg:'from-amber-500 to-orange-500',  light:'bg-amber-50',   border:'border-amber-200',   text:'text-amber-700'   },
  { bg:'from-rose-500 to-pink-500',     light:'bg-rose-50',    border:'border-rose-200',    text:'text-rose-700'    },
];
const levelPal = (idx) => LEVEL_PALETTE[idx % LEVEL_PALETTE.length];

// ─── Question-type config ──────────────────────────────────────────────────
const Q_TYPES = [
  { value:'mcq',   label:'MCQ',                icon:List,      sub:'4 options · text or image'     },
  { value:'match', label:'Match the Following', icon:AlignLeft, sub:'Pair matching · text or image'  },
  { value:'image', label:'Image-Based',         icon:Image,     sub:'Question image + options'       },
];
const DIFF_CFG = {
  easy:   { label:'Easy',   cls:'bg-green-100 text-green-700' },
  medium: { label:'Medium', cls:'bg-amber-100 text-amber-700' },
  hard:   { label:'Hard',   cls:'bg-red-100   text-red-700'   },
};

// ─── Blank question factories ─────────────────────────────────────────────
const blankOpt  = () => ({ text: '', imageUrl: '' });
const blankPair = () => ({ left: '', leftImage: '', right: '', rightImage: '' });
const blankMcq   = () => ({ type:'mcq',   text:'', imageUrl:'', difficulty:'easy', options:[blankOpt(),blankOpt(),blankOpt(),blankOpt()], correct:0, explanation:'' });
const blankMatch = () => ({ type:'match', text:'', imageUrl:'', difficulty:'easy', pairs:[blankPair(),blankPair(),blankPair(),blankPair()], explanation:'' });
const blankImage = () => ({ type:'image', text:'', imageUrl:'', difficulty:'easy', options:[blankOpt(),blankOpt(),blankOpt(),blankOpt()], correct:0, explanation:'' });
const blankForType = (t) => t==='match'?blankMatch():t==='image'?blankImage():blankMcq();

// ─── CSV parser ───────────────────────────────────────────────────────────
const CSV_TEMPLATE = [
  'type,text,difficulty,opt_a,opt_b,opt_c,opt_d,correct,explanation,image_url(img only),p1_left,p1_right,p2_left,p2_right,p3_left,p3_right,p4_left,p4_right',
  'mcq,What is a sensor?,easy,Input device,Output device,Control unit,Power supply,A,A sensor detects signals from the environment,,,,,,,,,',
  'image,What component is shown?,medium,Servo motor,DC motor,Stepper motor,Solenoid,C,,https://example.com/img.jpg,,,,,,,,,',
  'match,Match the component to its function,easy,,,,,,,,,Sensor,Detects input,Motor,Creates motion,CPU,Processes data,Battery,Stores energy',
].join('\n');

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const questions = [];
  for (const row of lines.slice(1)) {
    const cols = row.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || [];
    const clean = (c='') => c.replace(/^"|"$/g,'').trim();
    const type = clean(cols[0])?.toLowerCase();
    const text = clean(cols[1]);
    if (!text) continue;
    const diff = ['easy','medium','hard'].includes(clean(cols[2])) ? clean(cols[2]) : 'easy';
    if (type==='mcq')   questions.push({ id:uid('q'), type:'mcq', text, difficulty:diff, options:[clean(cols[3]),clean(cols[4]),clean(cols[5]),clean(cols[6])].map(t=>({text:t,imageUrl:''})), correct:Math.max(0,['A','B','C','D'].indexOf((clean(cols[7])||'A').toUpperCase())), explanation:clean(cols[8])||'' });
    else if (type==='match') questions.push({ id:uid('q'), type:'match', text, difficulty:diff, pairs:[{left:clean(cols[10]),leftImage:'',right:clean(cols[11]),rightImage:''},{left:clean(cols[12]),leftImage:'',right:clean(cols[13]),rightImage:''},{left:clean(cols[14]),leftImage:'',right:clean(cols[15]),rightImage:''},{left:clean(cols[16]),leftImage:'',right:clean(cols[17]),rightImage:''}], explanation:'' });
    else if (type==='image') questions.push({ id:uid('q'), type:'image', text, difficulty:diff, imageUrl:clean(cols[9])||'', options:[clean(cols[3]),clean(cols[4]),clean(cols[5]),clean(cols[6])].map(t=>({text:t,imageUrl:''})), correct:Math.max(0,['A','B','C','D'].indexOf((clean(cols[7])||'A').toUpperCase())), explanation:clean(cols[8])||'' });
  }
  return questions;
}

// ─── Bank stats helper ────────────────────────────────────────────────────
function bankStats(bank) {
  const levels = bank.levels || [];
  const cats   = levels.flatMap(l => l.categories || []);
  const qs     = cats.flatMap(c => c.questions   || []);
  return { levels: levels.length, categories: cats.length, questions: qs.length };
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared UI helpers
// ═══════════════════════════════════════════════════════════════════════════
function DeleteModal({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title||'Confirm Delete'} size="sm"
      footer={<>
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
      </>}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle size={18} className="text-red-500"/></div>
        <p className="text-slate-600 text-sm leading-relaxed pt-1">{message||'This action cannot be undone.'}</p>
      </div>
    </Modal>
  );
}

function InlineInput({ placeholder, onSave, onCancel, initial='' }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="flex items-center gap-2">
      <input autoFocus value={val} onChange={e=>setVal(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter'&&val.trim()) onSave(val.trim()); if(e.key==='Escape') onCancel(); }}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-xl border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"/>
      <button onClick={()=>val.trim()&&onSave(val.trim())} className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"><Check size={14}/></button>
      <button onClick={onCancel} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"><X size={14}/></button>
    </div>
  );
}

// ─── Image Upload helper ──────────────────────────────────────────────────
function ImageUpload({ value, onChange, compact = false, label = 'Image' }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);

  const process = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  if (value) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
        <img src={value} alt={label}
          className={`w-full object-cover ${compact ? 'h-16' : 'h-28'}`} />
        <button onClick={() => onChange('')}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100">
          <X size={9} />
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files[0]); }}
      className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
        drag ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
      } ${compact ? 'h-14' : 'h-24'}`}>
      <Upload size={compact ? 13 : 18} className={drag ? 'text-indigo-500' : 'text-slate-300'} />
      <p className={`font-semibold text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        {compact ? 'Add Image' : 'Upload Image'}
      </p>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => process(e.target.files[0])} />
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Import Modal (per-level Excel import)
// ═══════════════════════════════════════════════════════════════════════════
function ImportModal({ isOpen, onClose, levelName, categories, onImport }) {
  const [step,       setStep]       = useState('upload');
  const [parsed,     setParsed]     = useState([]);
  const [error,      setError]      = useState('');
  const [catId,      setCatId]      = useState(categories[0]?.id||'');
  const [newCatName, setNewCatName] = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const [importing,  setImporting]  = useState(false);

  const reset = () => { setStep('upload'); setParsed([]); setError(''); setCatId(categories[0]?.id||''); setNewCatName(''); };

  const processFile = (f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv','txt','xlsx','xls'].includes(ext)) { setError('Please upload a .csv or .xlsx file'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const qs = parseCSV(e.target.result);
        if (!qs.length) { setError('No valid questions found. Check format.'); return; }
        setParsed(qs); setStep('preview');
      } catch { setError('Could not parse file. Ensure it matches the template.'); }
    };
    reader.readAsText(f);
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE],{type:'text/csv'}));
    a.download = 'question_bank_template.csv'; a.click();
  };

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      onImport(parsed, catId==='__new__' ? null : catId, catId==='__new__' ? newCatName.trim()||'Imported' : null);
      setImporting(false); setStep('done');
    }, 600);
  };

  const typeLabel = (t) => Q_TYPES.find(q=>q.value===t)?.label||t;

  return (
    <Modal isOpen={isOpen} onClose={()=>{reset();onClose();}} title={`Import Questions — ${levelName}`} size="lg"
      footer={
        step==='preview' ? (
          <div className="flex items-center justify-between w-full">
            <button onClick={()=>setStep('upload')} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Back</button>
            <div className="flex gap-3">
              <button onClick={()=>{reset();onClose();}} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleImport} disabled={importing||(catId==='__new__'&&!newCatName.trim())}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {importing?<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Importing…</>:<><Upload size={14}/>Import {parsed.length} Questions</>}
              </button>
            </div>
          </div>
        ) : step==='done' ? (
          <button onClick={()=>{reset();onClose();}} className="px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors">Done</button>
        ) : null
      }>
      {step==='upload' && (
        <div className="space-y-5">
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-sm font-bold text-indigo-800 mb-3">Supported Column Formats</p>
            <div className="grid grid-cols-3 gap-3">
              {[{type:'MCQ',cols:['type','text','difficulty','opt_a–opt_d','correct (A–D)']},{type:'Image',cols:['type','text','difficulty','image_url','opt_a–opt_d','correct']},{type:'Match',cols:['type','text','difficulty','p1_left, p1_right','… (4 pairs)']}].map(f=>(
                <div key={f.type} className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 mb-2">{f.type}</p>
                  {f.cols.map(c=><p key={c} className="text-[10px] text-slate-500 font-mono">• {c}</p>)}
                </div>
              ))}
            </div>
            <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              <Download size={12}/> Download CSV Template
            </button>
          </div>
          <label onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);processFile(e.dataTransfer.files[0]);}}
            className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver?'border-indigo-400 bg-indigo-50':'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
            <FileSpreadsheet size={36} className={`mx-auto mb-3 ${dragOver?'text-indigo-500':'text-slate-300'}`}/>
            <p className="text-sm font-semibold text-slate-600">Drop your CSV / Excel file here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse · .csv and .xlsx supported</p>
            <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={e=>processFile(e.target.files[0])}/>
          </label>
          {error && <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600"><AlertCircle size={14}/>{error}</div>}
        </div>
      )}
      {step==='preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {[{l:'Total',v:parsed.length,c:'bg-slate-100 text-slate-700'},{l:'MCQ',v:parsed.filter(q=>q.type==='mcq').length,c:'bg-blue-100 text-blue-700'},{l:'Match',v:parsed.filter(q=>q.type==='match').length,c:'bg-violet-100 text-violet-700'},{l:'Image',v:parsed.filter(q=>q.type==='image').length,c:'bg-rose-100 text-rose-700'}].map(s=>(
              <div key={s.l} className={`px-4 py-2 rounded-xl text-center ${s.c}`}>
                <p className="text-lg font-bold">{s.v}</p><p className="text-[10px] font-semibold">{s.l}</p>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Import Into Category</label>
            <select value={catId} onChange={e=>setCatId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__new__">+ Create new category</option>
            </select>
            {catId==='__new__' && <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="New category name…" className="mt-2 w-full px-3 py-2.5 rounded-xl border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>}
          </div>
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100"><p className="text-xs font-bold text-slate-500">Preview (first 5 of {parsed.length})</p></div>
            <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
              {parsed.slice(0,5).map((q,i)=>(
                <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0 mt-0.5">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{q.text}</p>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">{typeLabel(q.type)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${DIFF_CFG[q.difficulty]?.cls}`}>{DIFF_CFG[q.difficulty]?.label}</span>
                    </div>
                  </div>
                </div>
              ))}
              {parsed.length>5 && <div className="px-4 py-2 text-center text-xs text-slate-400 italic">…and {parsed.length-5} more</div>}
            </div>
          </div>
        </div>
      )}
      {step==='done' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4"><CheckCircle size={32} className="text-green-500"/></div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{parsed.length} Questions Imported!</h3>
          <p className="text-sm text-slate-500">Questions added to <span className="font-semibold text-slate-700">{levelName}</span></p>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Question Form Modal  (supports text + image for all fields)
// ═══════════════════════════════════════════════════════════════════════════
function QuestionFormModal({ isOpen, onClose, onSave, initial, levelName, catName }) {
  const [form, setForm]     = useState(() => initial ? { ...initial, options: initial.options?.map(normalizeOpt), pairs: initial.pairs?.map(normalizePair) } : blankMcq());
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);

  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const setOpt = (i, field, val) => setForm(p => {
    const opts = p.options.map(normalizeOpt);
    opts[i] = { ...opts[i], [field]: val };
    return { ...p, options: opts };
  });

  const setPair = (i, side, val) => setForm(p => {
    const pairs = (p.pairs || []).map(normalizePair);
    pairs[i] = { ...pairs[i], [side]: val };
    return { ...p, pairs };
  });

  const handleTypeChange = (t) => {
    setForm(p => ({ ...blankForType(t), id: p.id, difficulty: p.difficulty, text: p.text, imageUrl: p.imageUrl || '' }));
    setErrors({});
  };

  const validate = () => {
    const e = {};
    if (!form.text.trim() && !form.imageUrl) e.text = 'Question text or image required';
    if (form.type === 'match') {
      (form.pairs || []).forEach((p, i) => {
        const pr = normalizePair(p);
        if ((!pr.left.trim() && !pr.leftImage) || (!pr.right.trim() && !pr.rightImage))
          e[`pair${i}`] = 'Both sides need text or image';
      });
    } else {
      (form.options || []).forEach((o, i) => {
        const opt = normalizeOpt(o);
        if (!opt.text.trim() && !opt.imageUrl) e[`opt${i}`] = 'Fill all options';
      });
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, id: form.id || uid('q'), text: form.text.trim() });
  };

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all';
  const lbl = 'text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={form.id ? 'Edit Question' : 'Add New Question'} size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button onClick={() => setPreview(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${preview ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {preview ? <EyeOff size={13}/> : <Eye size={13}/>} {preview ? 'Hide Preview' : 'Preview'}
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
              <Save size={14}/>{form.id ? 'Save Changes' : 'Add Question'}
            </button>
          </div>
        </div>
      }>
      <div className="space-y-5">
        {(levelName || catName) && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
            <Layers size={12}/>{levelName && <span className="font-semibold text-slate-600">{levelName}</span>}
            {levelName && catName && <ChevronRight size={10}/>}
            {catName && <span className="font-semibold text-slate-600">{catName}</span>}
          </div>
        )}

        {/* ── Question Type ── */}
        <div>
          <label className={lbl}>Question Type</label>
          <div className="grid grid-cols-3 gap-2">
            {Q_TYPES.map(qt => { const Icon = qt.icon; return (
              <button key={qt.value} type="button" onClick={() => handleTypeChange(qt.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${form.type === qt.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <Icon size={16} className={`mb-1.5 ${form.type === qt.value ? 'text-indigo-600' : 'text-slate-400'}`}/>
                <p className={`text-xs font-bold ${form.type === qt.value ? 'text-indigo-700' : 'text-slate-700'}`}>{qt.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{qt.sub}</p>
              </button>
            );})}
          </div>
        </div>

        {/* ── Question Text + Image ── */}
        <div className="space-y-2">
          <label className={lbl}>
            Question Text <span className="text-slate-400 normal-case font-normal">(or image only)</span>
          </label>
          <textarea rows={3} value={form.text} onChange={e => set('text', e.target.value)}
            placeholder="Type your question here… (leave blank if image only)"
            className={`${inp} resize-none ${errors.text ? 'border-red-400' : ''}`}/>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mb-1">
            <Image size={11}/> Question Image <span className="font-normal">(optional — use with or instead of text)</span>
          </div>
          <ImageUpload value={form.imageUrl || ''} onChange={v => set('imageUrl', v)} />
          {errors.text && <p className="text-xs text-red-500">{errors.text}</p>}
        </div>

        {/* ── MCQ / Image options ── */}
        {(form.type === 'mcq' || form.type === 'image') && (
          <div>
            <label className={lbl}>
              Answer Options <span className="text-red-400">*</span>
              <span className="normal-case font-normal text-slate-400 ml-1">Click letter to mark correct · each option can be text, image, or both</span>
            </label>
            <div className="space-y-2">
              {(form.options || []).map((opt, i) => {
                const optObj = normalizeOpt(opt);
                const correct = form.correct === i;
                return (
                  <div key={i} className={`rounded-xl border-2 p-3 transition-all ${correct ? 'border-green-300 bg-green-50' : errors[`opt${i}`] ? 'border-red-300' : 'border-slate-100 bg-slate-50/60'}`}>
                    <div className="flex items-center gap-2.5 mb-2">
                      <button type="button" onClick={() => set('correct', i)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all ${correct ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-400 hover:border-green-400'}`}>
                        {String.fromCharCode(65 + i)}
                      </button>
                      <input value={optObj.text} onChange={e => setOpt(i, 'text', e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + i)} text… (or image only)`}
                        className={`flex-1 bg-transparent outline-none text-sm placeholder-slate-300 ${correct ? 'text-green-800 font-semibold' : 'text-slate-700'}`}/>
                      {correct && <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 shrink-0"><Check size={10}/>Correct</span>}
                    </div>
                    <ImageUpload value={optObj.imageUrl} onChange={v => setOpt(i, 'imageUrl', v)} compact />
                    {errors[`opt${i}`] && <p className="text-[10px] text-red-500 mt-1">{errors[`opt${i}`]}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Match pairs ── */}
        {form.type === 'match' && (
          <div>
            <label className={lbl}>
              Match Pairs <span className="text-red-400">*</span>
              <span className="normal-case font-normal text-slate-400 ml-1">Each side can have text, image, or both</span>
            </label>
            <div className="space-y-3">
              {(form.pairs || []).map((pair, i) => {
                const pr = normalizePair(pair);
                return (
                  <div key={i} className={`bg-slate-50 rounded-xl p-3 border-2 ${errors[`pair${i}`] ? 'border-red-300' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Pair {i + 1}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Left Side</p>
                        <input value={pr.left} onChange={e => setPair(i, 'left', e.target.value)}
                          placeholder="Text…"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                        <ImageUpload value={pr.leftImage} onChange={v => setPair(i, 'leftImage', v)} compact />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Right Side</p>
                        <input value={pr.right} onChange={e => setPair(i, 'right', e.target.value)}
                          placeholder="Text…"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                        <ImageUpload value={pr.rightImage} onChange={v => setPair(i, 'rightImage', v)} compact />
                      </div>
                    </div>
                    {errors[`pair${i}`] && <p className="text-[10px] text-red-500 mt-1">{errors[`pair${i}`]}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Difficulty ── */}
        <div>
          <label className={lbl}>Difficulty</label>
          <div className="flex gap-2">
            {Object.entries(DIFF_CFG).map(([k, v]) => (
              <button key={k} type="button" onClick={() => set('difficulty', k)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.difficulty === k ? `${v.cls} border-current` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Explanation ── */}
        <div>
          <label className={lbl}>Explanation <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
          <textarea rows={2} value={form.explanation || ''} onChange={e => set('explanation', e.target.value)}
            placeholder="Explain why the answer is correct…"
            className={`${inp} resize-none`}/>
        </div>

        {/* ── Preview ── */}
        {preview && (
          <div className="border border-indigo-100 rounded-2xl overflow-hidden">
            <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
              <p className="text-xs font-bold text-indigo-600">Student Preview</p>
            </div>
            <div className="p-4 space-y-3">
              {form.imageUrl && <img src={form.imageUrl} alt="Question" className="w-full h-36 object-cover rounded-xl border border-slate-200"/>}
              <p className="text-sm font-semibold text-slate-800">{form.text || <span className="italic text-slate-400">No text…</span>}</p>
              {form.type === 'match' ? (
                <div className="space-y-1.5">
                  {(form.pairs || []).map((p, i) => {
                    const pr = normalizePair(p);
                    return (
                      <div key={i} className="flex items-stretch gap-2 text-xs">
                        <div className="flex-1 bg-slate-50 rounded-lg p-2 text-slate-700 font-medium">
                          {pr.leftImage && <img src={pr.leftImage} alt="" className="w-full h-12 object-cover rounded-lg mb-1.5"/>}
                          {pr.left && <span>{pr.left}</span>}
                        </div>
                        <span className="text-slate-400 font-bold self-center">↔</span>
                        <div className="flex-1 bg-green-50 rounded-lg p-2 text-green-700 font-medium">
                          {pr.rightImage && <img src={pr.rightImage} alt="" className="w-full h-12 object-cover rounded-lg mb-1.5"/>}
                          {pr.right && <span>{pr.right}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(form.options || []).map((opt, i) => {
                    const o = normalizeOpt(opt);
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${i === form.correct ? 'bg-green-50 border-green-200 text-green-800 font-semibold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === form.correct ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{String.fromCharCode(65 + i)}</span>
                        {o.imageUrl && <img src={o.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"/>}
                        {o.text && <span>{o.text}</span>}
                        {!o.text && !o.imageUrl && <span className="text-slate-400 italic">—</span>}
                        {i === form.correct && <CheckCircle size={10} className="ml-auto text-green-500"/>}
                      </div>
                    );
                  })}
                </div>
              )}
              {form.explanation && <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700"><span className="font-bold">Explanation: </span>{form.explanation}</div>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Question Row
// ═══════════════════════════════════════════════════════════════════════════
function QuestionRow({ q, index, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = Q_TYPES.find(t => t.value === q.type)?.label || q.type;
  const hasImg = !!q.imageUrl;
  return (
    <div className={`bg-white rounded-xl border transition-all ${expanded ? 'border-slate-200 shadow-sm' : 'border-slate-100'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{index}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {hasImg && <Image size={12} className="text-indigo-400 shrink-0"/>}
            <p className="text-sm font-semibold text-slate-800 truncate">{q.text || <span className="italic text-slate-400">{hasImg ? '[Image question]' : 'Untitled'}</span>}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{typeLabel}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DIFF_CFG[q.difficulty]?.cls || 'bg-slate-100 text-slate-500'}`}>{DIFF_CFG[q.difficulty]?.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(p => !p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">{expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
          {q.imageUrl && <img src={q.imageUrl} alt="Question" className="w-full h-32 object-cover rounded-xl border border-slate-200"/>}
          {q.type === 'match' ? (
            <div className="space-y-1.5">
              {(q.pairs || []).map((p, i) => {
                const pr = normalizePair(p);
                return (
                  <div key={i} className="flex items-stretch gap-2 text-xs">
                    <div className="flex-1 bg-slate-50 rounded-lg p-2 text-slate-700 font-medium">
                      {pr.leftImage && <img src={pr.leftImage} alt="" className="w-full h-10 object-cover rounded-lg mb-1"/>}
                      {pr.left && <span>{pr.left}</span>}
                      {!pr.left && !pr.leftImage && <span className="text-slate-400">—</span>}
                    </div>
                    <span className="text-slate-400 font-bold self-center shrink-0">→</span>
                    <div className="flex-1 bg-green-50 rounded-lg p-2 text-green-700 font-medium">
                      {pr.rightImage && <img src={pr.rightImage} alt="" className="w-full h-10 object-cover rounded-lg mb-1"/>}
                      {pr.right && <span>{pr.right}</span>}
                      {!pr.right && !pr.rightImage && <span className="text-green-400">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {(q.options || []).map((opt, i) => {
                const o = normalizeOpt(opt);
                return (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${i === q.correct ? 'bg-green-50 border-green-200 text-green-800 font-semibold' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === q.correct ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{String.fromCharCode(65 + i)}</span>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {o.imageUrl && <img src={o.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"/>}
                      <span className="truncate">{o.text || (o.imageUrl ? '[Image]' : '—')}</span>
                    </div>
                    {i === q.correct && <CheckCircle size={10} className="ml-auto text-green-500 shrink-0"/>}
                  </div>
                );
              })}
            </div>
          )}
          {q.explanation && <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700"><span className="font-bold">Explanation: </span>{q.explanation}</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Category Section
// ═══════════════════════════════════════════════════════════════════════════
function CategorySection({ cat, levelName, pal, onRename, onDelete, onQuestionsChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const [qModal,    setQModal]    = useState(null);
  const [deleteQ,   setDeleteQ]   = useState(null);
  const [renaming,  setRenaming]  = useState(false);
  const qCount = (cat.questions||[]).length;

  const handleAdd  = (q) => { onQuestionsChange([...(cat.questions||[]),q]); setQModal(null); };
  const handleEdit = (u) => { onQuestionsChange((cat.questions||[]).map(q=>q.id===u.id?u:q)); setQModal(null); };
  const handleDel  = () =>  { onQuestionsChange((cat.questions||[]).filter(q=>q.id!==deleteQ.id)); setDeleteQ(null); };

  return (
    <div className={`rounded-2xl border-2 ${pal.border} overflow-hidden`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${pal.light}`}>
        <button onClick={()=>setCollapsed(p=>!p)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {collapsed?<Folder size={16} className={pal.text}/>:<FolderOpen size={16} className={pal.text}/>}
          {renaming?(
            <div className="flex-1" onClick={e=>e.stopPropagation()}>
              <InlineInput initial={cat.name} placeholder="Category name" onSave={v=>{onRename(v);setRenaming(false);}} onCancel={()=>setRenaming(false)}/>
            </div>
          ):(
            <>
              <span className={`text-sm font-bold ${pal.text} truncate`}>{cat.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 ${pal.text} shrink-0`}>{qCount} {qCount===1?'question':'questions'}</span>
            </>
          )}
        </button>
        {!renaming&&(
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={()=>setQModal('add')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border ${pal.border} ${pal.text} text-xs font-bold hover:opacity-80 transition-all shadow-sm`}>
              <Plus size={12}/>Add Questions
            </button>
            <button onClick={()=>setRenaming(true)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors"><Edit2 size={13}/></button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
            <button onClick={()=>setCollapsed(p=>!p)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors">{collapsed?<ChevronDown size={13}/>:<ChevronUp size={13}/>}</button>
          </div>
        )}
      </div>
      {!collapsed&&(
        <div className="p-4 bg-white">
          {qCount===0?(
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <HelpCircle size={28} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-sm font-semibold text-slate-400">No questions yet</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">Add MCQ, Match, or Image-based questions</p>
              <button onClick={()=>setQModal('add')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                <Plus size={12}/>Add First Question
              </button>
            </div>
          ):(
            <div className="space-y-2">
              {(cat.questions||[]).map((q,i)=>(
                <QuestionRow key={q.id} q={q} index={i+1} onEdit={()=>setQModal(q)} onDelete={()=>setDeleteQ(q)}/>
              ))}
              <button onClick={()=>setQModal('add')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all">
                <Plus size={13}/>Add Another Question
              </button>
            </div>
          )}
        </div>
      )}
      {qModal!==null&&<QuestionFormModal isOpen onClose={()=>setQModal(null)} onSave={qModal==='add'?handleAdd:handleEdit} initial={qModal==='add'?null:qModal} levelName={levelName} catName={cat.name}/>}
      <DeleteModal isOpen={!!deleteQ} onClose={()=>setDeleteQ(null)} onConfirm={handleDel} title="Delete Question?" message={`"${deleteQ?.text||'This question'}" will be permanently removed.`}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Level Section
// ═══════════════════════════════════════════════════════════════════════════
function LevelSection({ level, index, onUpdate, onDelete }) {
  const pal = levelPal(index);
  const [collapsed,   setCollapsed]   = useState(false);
  const [addingCat,   setAddingCat]   = useState(false);
  const [renaming,    setRenaming]    = useState(false);
  const [deleteLevel, setDeleteLevel] = useState(false);
  const [deleteCat,   setDeleteCat]   = useState(null);
  const [importOpen,  setImportOpen]  = useState(false);

  const cats   = level.categories||[];
  const qTotal = cats.reduce((s,c)=>s+(c.questions||[]).length,0);
  const update = useCallback((patch)=>onUpdate({...level,...patch}),[level,onUpdate]);

  const handleImport = (questions, catId, newCatName) => {
    const newCats = catId
      ? cats.map(c=>c.id===catId?{...c,questions:[...(c.questions||[]),...questions]}:c)
      : [...cats,{id:uid('cat'),name:newCatName||'Imported',questions}];
    update({categories:newCats});
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      <div className={`bg-gradient-to-r ${pal.bg} px-5 py-4`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Layers size={16} className="text-white"/></div>
          <div className="flex-1 min-w-0">
            {renaming?(
              <div onClick={e=>e.stopPropagation()}>
                <InlineInput initial={level.name} placeholder="Level name" onSave={v=>{update({name:v});setRenaming(false);}} onCancel={()=>setRenaming(false)}/>
              </div>
            ):(
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-base" style={{fontFamily:'Space Grotesk'}}>{level.name}</h3>
                <span className="text-white/70 text-xs font-semibold">{cats.length} {cats.length===1?'category':'categories'} · {qTotal} questions</span>
              </div>
            )}
          </div>
          {!renaming&&(
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <button onClick={()=>setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/30">
                <Upload size={12}/>Import Excel
              </button>
              <button onClick={()=>setAddingCat(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all">
                <Plus size={13}/>Add Category
              </button>
              <button onClick={()=>setRenaming(true)} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white/80 hover:text-white transition-all"><Edit2 size={13}/></button>
              <button onClick={()=>setDeleteLevel(true)} className="p-1.5 rounded-xl bg-white/15 hover:bg-red-400/50 text-white/80 hover:text-white transition-all"><Trash2 size={13}/></button>
              <button onClick={()=>setCollapsed(p=>!p)} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all">{collapsed?<ChevronDown size={15}/>:<ChevronUp size={15}/>}</button>
            </div>
          )}
        </div>
      </div>
      {!collapsed&&(
        <div className={`${pal.light} px-5 py-4 space-y-3`}>
          {addingCat&&(
            <div className={`bg-white rounded-2xl border-2 ${pal.border} p-4`}>
              <p className={`text-xs font-bold ${pal.text} mb-2`}>New Category Name</p>
              <InlineInput placeholder="e.g. Robotics Basics, Sensors…" onSave={n=>{update({categories:[...cats,{id:uid('cat'),name:n,questions:[]}]});setAddingCat(false);}} onCancel={()=>setAddingCat(false)}/>
            </div>
          )}
          {cats.length===0&&!addingCat?(
            <div className="text-center py-10 bg-white/70 rounded-2xl border-2 border-dashed border-white">
              <Tag size={28} className={`${pal.text} mx-auto mb-2 opacity-40`}/>
              <p className={`text-sm font-semibold ${pal.text} opacity-60`}>No categories yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">Create categories or import from Excel</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={()=>setAddingCat(true)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${pal.bg}`}><Plus size={12}/>Add Category</button>
                <button onClick={()=>setImportOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50"><Upload size={12}/>Import Excel</button>
              </div>
            </div>
          ):(
            cats.map(cat=>(
              <CategorySection key={cat.id} cat={cat} levelName={level.name} pal={pal}
                onRename={name=>update({categories:cats.map(c=>c.id===cat.id?{...c,name}:c)})}
                onDelete={()=>setDeleteCat(cat)}
                onQuestionsChange={qs=>update({categories:cats.map(c=>c.id===cat.id?{...c,questions:qs}:c)})}/>
            ))
          )}
          {cats.length>0&&!addingCat&&(
            <button onClick={()=>setAddingCat(true)} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-white text-xs font-semibold ${pal.text} opacity-70 hover:opacity-100 hover:bg-white/50 transition-all`}>
              <Plus size={13}/>Add Category
            </button>
          )}
        </div>
      )}
      {importOpen&&<ImportModal isOpen levelName={level.name} categories={cats} onClose={()=>setImportOpen(false)} onImport={(qs,catId,newCatName)=>{handleImport(qs,catId,newCatName);setImportOpen(false);}}/>}
      <DeleteModal isOpen={deleteLevel} onClose={()=>setDeleteLevel(false)} onConfirm={()=>{setDeleteLevel(false);onDelete();}} title={`Delete ${level.name}?`} message={`"${level.name}" and all its ${cats.length} categories and ${qTotal} questions will be permanently deleted.`}/>
      <DeleteModal isOpen={!!deleteCat} onClose={()=>setDeleteCat(null)} onConfirm={()=>{update({categories:cats.filter(c=>c.id!==deleteCat.id)});setDeleteCat(null);}} title={`Delete "${deleteCat?.name}"?`} message={`This category and its ${(deleteCat?.questions||[]).length} questions will be permanently removed.`}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Bank Detail View
// ═══════════════════════════════════════════════════════════════════════════
function BankDetail({ bank, bankIndex, onBack, onUpdate }) {
  const [addingLevel, setAddingLevel] = useState(false);
  const [renamingBank, setRenamingBank] = useState(false);

  const levels     = bank.levels || [];
  const totalCats  = levels.reduce((s,l)=>s+(l.categories||[]).length,0);
  const totalQs    = levels.reduce((s,l)=>s+(l.categories||[]).reduce((ss,c)=>ss+(c.questions||[]).length,0),0);
  const pal        = bankPal(bankIndex);

  const updateLevel = useCallback((idx, updated) => {
    onUpdate({ ...bank, levels: levels.map((l,i)=>i===idx?updated:l) });
  }, [bank, levels, onUpdate]);

  const deleteLevel = useCallback((idx) => {
    onUpdate({ ...bank, levels: levels.filter((_,i)=>i!==idx) });
  }, [bank, levels, onUpdate]);

  const addLevel = (name) => {
    const newLevel = { id:uid('level'), name:name||`Level ${levels.length+1}`, categories:[] };
    onUpdate({ ...bank, levels:[...levels, newLevel] });
    setAddingLevel(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors mb-2 group">
            <span className="text-base leading-none group-hover:-translate-x-0.5 transition-transform">←</span>
            <span className="font-semibold">All Question Banks</span>
          </button>
          {renamingBank ? (
            <div className="max-w-xs">
              <InlineInput initial={bank.name} placeholder="Bank name" onSave={v=>{onUpdate({...bank,name:v});setRenamingBank(false);}} onCancel={()=>setRenamingBank(false)}/>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${pal.grad}`}>
                <Database size={14} className="text-white"/>
              </div>
              <h1 className="text-2xl font-bold text-slate-800" style={{fontFamily:'Space Grotesk'}}>{bank.name}</h1>
              <button onClick={()=>setRenamingBank(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Edit2 size={14}/></button>
            </div>
          )}
          <p className="text-sm text-slate-400 mt-1 ml-10">
            <span className="font-semibold text-slate-600">{levels.length}</span> levels ·{' '}
            <span className="font-semibold text-slate-600">{totalCats}</span> categories ·{' '}
            <span className={`font-semibold ${pal.text}`}>{totalQs}</span> questions
          </p>
        </div>
        <button onClick={()=>setAddingLevel(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-all bg-gradient-to-r ${pal.grad}`}>
          <Plus size={16}/>Add Level
        </button>
      </div>

      {addingLevel && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 shadow-sm">
          <p className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2"><Layers size={15}/>New Level</p>
          <InlineInput placeholder={`e.g. Level ${levels.length+1}, Advanced…`} onSave={addLevel} onCancel={()=>setAddingLevel(false)}/>
        </div>
      )}

      {levels.length===0&&!addingLevel ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Layers size={36} className="text-slate-300 mx-auto mb-3"/>
          <p className="font-semibold text-slate-400">No levels yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Add a level to start organising your questions</p>
          <button onClick={()=>setAddingLevel(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
            <Plus size={15}/>Add Level
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {levels.map((level,idx)=>(
            <LevelSection key={level.id} level={level} index={idx}
              onUpdate={u=>updateLevel(idx,u)} onDelete={()=>deleteLevel(idx)}/>
          ))}
          {!addingLevel && (
            <button onClick={()=>setAddingLevel(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all">
              <Plus size={15}/>Add Another Level
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Banks Overview
// ═══════════════════════════════════════════════════════════════════════════
function BanksOverview({ banks, onSelect, onCreate, onDelete, onRename }) {
  const [creatingName, setCreatingName]   = useState('');
  const [showCreate,   setShowCreate]     = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [menuOpen,     setMenuOpen]       = useState(null);
  const [renamingId,   setRenamingId]     = useState(null);

  const handleCreate = () => {
    const name = creatingName.trim() || `Question Bank ${banks.length + 1}`;
    onCreate(name);
    setCreatingName('');
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{fontFamily:'Space Grotesk'}}>Question Banks</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {banks.length} {banks.length===1?'bank':'banks'} ·{' '}
            {banks.reduce((s,b)=>s+bankStats(b).questions,0)} total questions
          </p>
        </div>
        <button onClick={()=>setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-all"
          style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
          <Plus size={16}/>New Question Bank
        </button>
      </div>

      <Modal isOpen={showCreate} onClose={()=>setShowCreate(false)} title="Create Question Bank" size="sm"
        footer={<>
          <button onClick={()=>setShowCreate(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleCreate} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Plus size={14}/>Create Bank
          </button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Bank Name</label>
            <input autoFocus value={creatingName} onChange={e=>setCreatingName(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') handleCreate(); if(e.key==='Escape') setShowCreate(false); }}
              placeholder={`Question Bank ${banks.length+1}`}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
            <p className="text-xs text-slate-400 mt-1.5">Leave blank to auto-name as "Question Bank {banks.length+1}"</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
            Starts with 3 default levels (Level 1, 2, 3). You can add, rename or delete levels after creation.
          </div>
        </div>
      </Modal>

      {banks.length === 0 && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-md text-center">
            <div className="relative mx-auto w-32 h-32 mb-8">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 rotate-6"/>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Database size={48} className="text-white"/>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{fontFamily:'Space Grotesk'}}>No Question Banks Yet</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
              Create multiple independent question banks, each with their own levels, categories, and questions.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {[{icon:Database,label:'Multiple Banks'},{icon:Layers,label:'Level Structure'},{icon:Tag,label:'Categories'},{icon:Upload,label:'Excel Import'}].map(({icon:Icon,label})=>(
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold"><Icon size={12}/>{label}</div>
              ))}
            </div>
            <button onClick={()=>setShowCreate(true)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              style={{background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)'}}>
              <div className="w-7 h-7 rounded-xl bg-white/25 flex items-center justify-center"><Plus size={18}/></div>
              Create First Question Bank
            </button>
          </div>
        </div>
      )}

      {banks.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank, idx) => {
            const pal   = bankPal(idx);
            const stats = bankStats(bank);
            const isRenaming = renamingId === bank.id;

            return (
              <div key={bank.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:border-slate-200 transition-all group relative"
                onMouseLeave={()=>{ if(menuOpen===bank.id) setMenuOpen(null); }}>

                <div className={`h-2 bg-gradient-to-r ${pal.grad}`}/>

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${pal.grad}`}>
                      <Database size={18} className="text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <InlineInput initial={bank.name} placeholder="Bank name"
                          onSave={v=>{onRename(bank.id,v);setRenamingId(null);}}
                          onCancel={()=>setRenamingId(null)}/>
                      ) : (
                        <h3 className="font-bold text-slate-800 text-sm leading-tight truncate" style={{fontFamily:'Space Grotesk'}}>{bank.name}</h3>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                        <Calendar size={10}/>
                        <span>Created {fmtDate(bank.createdAt)}</span>
                      </div>
                    </div>
                    {!isRenaming && (
                      <div className="relative shrink-0">
                        <button onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===bank.id?null:bank.id);}}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                          <MoreVertical size={15}/>
                        </button>
                        {menuOpen===bank.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-20 w-40">
                            <button onClick={()=>{setMenuOpen(null);setRenamingId(bank.id);}}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                              <Edit2 size={12}/>Rename
                            </button>
                            <button onClick={()=>{setMenuOpen(null);setDeleteTarget(bank);}}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={12}/>Delete Bank
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label:'Levels',     value:stats.levels,     pal },
                      { label:'Categories', value:stats.categories, pal },
                      { label:'Questions',  value:stats.questions,  pal },
                    ].map(s=>(
                      <div key={s.label} className={`${pal.soft} rounded-xl p-2.5 text-center`}>
                        <p className={`text-lg font-bold ${pal.text}`} style={{fontFamily:'Space Grotesk'}}>{s.value}</p>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={()=>onSelect(bank.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 bg-gradient-to-r ${pal.grad}`}>
                    <BookOpen size={14}/>Open Bank
                    <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={()=>setShowCreate(true)}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all p-5 flex flex-col items-center justify-center gap-3 min-h-[200px] group">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
              <Plus size={22} className="text-slate-400 group-hover:text-indigo-600 transition-colors"/>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500 group-hover:text-indigo-700 transition-colors">New Question Bank</p>
              <p className="text-xs text-slate-400 mt-0.5">Create another independent bank</p>
            </div>
          </button>
        </div>
      )}

      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={()=>setDeleteTarget(null)}
        onConfirm={()=>{ onDelete(deleteTarget.id); setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.name}"?`}
        message={`This will permanently delete "${deleteTarget?.name}" along with all its levels, categories, and ${bankStats(deleteTarget||{}).questions} questions.`}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Root Component
// ═══════════════════════════════════════════════════════════════════════════
export default function QuestionBankAdmin() {
  const [storage, setStorage]         = useState(() => loadStorage());
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [toast, setToast]             = useState('');

  const showToast = (msg, color='green') => { setToast({msg,color}); setTimeout(()=>setToast(''),2500); };

  const mutate = useCallback((updater) => {
    setStorage(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, []);

  const createBank = useCallback((name) => {
    const bank = {
      id: uid('bank'),
      name,
      createdAt: Date.now(),
      levels: [
        {id:uid('level'),name:'Level 1',categories:[]},
        {id:uid('level'),name:'Level 2',categories:[]},
        {id:uid('level'),name:'Level 3',categories:[]},
      ],
    };
    mutate(prev => ({ ...prev, banks:[...prev.banks, bank] }));
    showToast(`"${name}" created!`);
  }, [mutate]);

  const deleteBank = useCallback((id) => {
    mutate(prev => ({ ...prev, banks: prev.banks.filter(b=>b.id!==id) }));
    setSelectedBankId(curr => curr===id ? null : curr);
    showToast('Question bank deleted.','red');
  }, [mutate]);

  const renameBank = useCallback((id, name) => {
    mutate(prev => ({ ...prev, banks: prev.banks.map(b=>b.id===id?{...b,name}:b) }));
  }, [mutate]);

  const updateBank = useCallback((updated) => {
    mutate(prev => ({ ...prev, banks: prev.banks.map(b=>b.id===updated.id?updated:b) }));
  }, [mutate]);

  const selectedBank      = storage.banks.find(b=>b.id===selectedBankId);
  const selectedBankIndex = storage.banks.findIndex(b=>b.id===selectedBankId);

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6">

      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl border ${
          toast.color==='red'?'bg-red-50 border-red-200 text-red-700':'bg-green-50 border-green-200 text-green-800'
        }`}>
          <CheckCircle size={15}/>{toast.msg}
        </div>
      )}

      {selectedBank ? (
        <BankDetail
          bank={selectedBank}
          bankIndex={selectedBankIndex}
          onBack={()=>setSelectedBankId(null)}
          onUpdate={updateBank}
        />
      ) : (
        <BanksOverview
          banks={storage.banks}
          onSelect={setSelectedBankId}
          onCreate={createBank}
          onDelete={deleteBank}
          onRename={renameBank}
        />
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { scrollToTop } from '../../utils/scroll';
import * as XLSX from 'xlsx';
import {
  Plus, ChevronDown, ChevronUp, Edit2, Trash2, BookOpen,
  CheckCircle, X, Save, AlertTriangle, Image,
  List, AlignLeft, Layers, Tag, HelpCircle, Check,
  FolderOpen, Folder, Upload, Download, FileSpreadsheet, AlertCircle,
  ChevronRight, Database, MoreVertical, Calendar, ToggleLeft, Loader2,
  Users, UserCheck, Globe,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { api } from '../../utils/api';
import { CATEGORIES, CATEGORY_META } from '../../utils/questionBank';

// ─── Category name → DB category key ─────────────────────────────────────
const NAME_TO_CAT = Object.fromEntries(
  CATEGORIES.map(cat => [CATEGORY_META[cat].label.toLowerCase(), cat])
);
CATEGORIES.forEach(cat => { NAME_TO_CAT[cat] = cat; });

function getCatFromName(name = '') {
  return NAME_TO_CAT[name.toLowerCase().trim()] || name.toLowerCase().trim() || CATEGORIES[0];
}

// ─── Normalizers ─────────────────────────────────────────────────────────
function normalizeOpt(opt) {
  return typeof opt === 'string' ? { text: opt, imageUrl: '' } : (opt || { text: '', imageUrl: '' });
}
function normalizePair(pair) {
  return {
    left: pair?.left || '', leftImage: pair?.leftImage || '',
    right: pair?.right || '', rightImage: pair?.rightImage || '',
  };
}
const flattenOptions = (opts) =>
  Array.isArray(opts) ? opts.map(o => (typeof o === 'string' ? o : (o?.text || ''))) : opts;
const flattenPairs = (pairs) =>
  Array.isArray(pairs) ? pairs.map(p => ({ left: p?.left || '', right: p?.right || '' })) : pairs;

// ─── Unique ID (temp, local only) ────────────────────────────────────────
let _seq = Date.now();
function uid(p = 'id') { return `${p}-${++_seq}`; }

// ─── Bank colour palette ──────────────────────────────────────────────────
const BANK_PALETTE = [
  { grad:'from-indigo-500 to-blue-600',   soft:'bg-indigo-50',   border:'border-indigo-200',  text:'text-indigo-700'   },
  { grad:'from-violet-500 to-purple-600', soft:'bg-violet-50',   border:'border-violet-200',  text:'text-violet-700'   },
  { grad:'from-rose-500 to-pink-600',     soft:'bg-rose-50',     border:'border-rose-200',    text:'text-rose-700'     },
  { grad:'from-emerald-500 to-teal-600',  soft:'bg-emerald-50',  border:'border-emerald-200', text:'text-emerald-700'  },
  { grad:'from-amber-500 to-orange-600',  soft:'bg-amber-50',    border:'border-amber-200',   text:'text-amber-700'    },
  { grad:'from-sky-500 to-cyan-600',      soft:'bg-sky-50',      border:'border-sky-200',     text:'text-sky-700'      },
];
const bankPal = (idx) => BANK_PALETTE[idx % BANK_PALETTE.length];

// ─── Level colour palette ─────────────────────────────────────────────────
const LEVEL_PALETTE = [
  { bg:'from-indigo-500 to-blue-500',   light:'bg-indigo-50',  border:'border-indigo-200',  text:'text-indigo-700'  },
  { bg:'from-violet-500 to-purple-500', light:'bg-violet-50',  border:'border-violet-200',  text:'text-violet-700'  },
  { bg:'from-emerald-500 to-teal-500',  light:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-700' },
  { bg:'from-amber-500 to-orange-500',  light:'bg-amber-50',   border:'border-amber-200',   text:'text-amber-700'   },
  { bg:'from-rose-500 to-pink-500',     light:'bg-rose-50',    border:'border-rose-200',    text:'text-rose-700'    },
  { bg:'from-sky-500 to-cyan-500',      light:'bg-sky-50',     border:'border-sky-200',     text:'text-sky-700'     },
];
const levelPal = (idx) => LEVEL_PALETTE[idx % LEVEL_PALETTE.length];

// ─── Question-type config ─────────────────────────────────────────────────
const Q_TYPES = [
  { value:'mcq',       label:'MCQ',                icon:List,       sub:'4 options · text or image'      },
  { value:'match',     label:'Match the Following', icon:AlignLeft,  sub:'Pair matching · text or image'  },
  { value:'label',     label:'Label Question',      icon:Image,      sub:'Identify & label image parts'   },
  { value:'truefalse', label:'True / False',        icon:ToggleLeft, sub:'2 options · True or False'      },
];
const DIFF_CFG = {
  easy:   { label:'Easy',   cls:'bg-green-100 text-green-700' },
  medium: { label:'Medium', cls:'bg-amber-100 text-amber-700' },
  hard:   { label:'Hard',   cls:'bg-red-100   text-red-700'   },
};

// ─── Applicable-For config ────────────────────────────────────────────────
const AF_CFG = {
  student: { label:'Students Only',           badge:'bg-indigo-100 text-indigo-700', border:'border-indigo-400', icon: Users     },
  trainer: { label:'Trainers Only',           badge:'bg-violet-100 text-violet-700', border:'border-violet-400', icon: UserCheck },
  both:    { label:'Both',                    badge:'bg-teal-100   text-teal-700',   border:'border-teal-400',   icon: Globe     },
};

// ─── Blank factories ──────────────────────────────────────────────────────
const blankOpt  = () => ({ text: '', imageUrl: '' });
const blankPair = () => ({ left: '', leftImage: '', right: '', rightImage: '' });
const blankMcq       = (af='student') => ({ type:'mcq',       text:'', imageUrl:'', difficulty:'easy', applicableFor:af, options:[blankOpt(),blankOpt(),blankOpt(),blankOpt()], correct:null, explanation:'' });
const blankMatch     = (af='student') => ({ type:'match',     text:'', imageUrl:'', difficulty:'easy', applicableFor:af, pairs:[blankPair(),blankPair(),blankPair(),blankPair()], explanation:'' });
const blankLabel     = (af='student') => ({ type:'label',     text:'', imageUrl:'', difficulty:'easy', applicableFor:af, options:[blankOpt(),blankOpt(),blankOpt(),blankOpt()], correct:null, explanation:'' });
const blankTrueFalse = (af='student') => ({ type:'truefalse', text:'', imageUrl:'', difficulty:'easy', applicableFor:af, options:[{text:'True',imageUrl:''},{text:'False',imageUrl:''}], correct:null, explanation:'' });
const blankForType   = (t, af='student') => t==='match'?blankMatch(af):t==='label'?blankLabel(af):t==='truefalse'?blankTrueFalse(af):blankMcq(af);

// ─── CSV parser ───────────────────────────────────────────────────────────
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
    if (type==='mcq')                         questions.push({ id:uid('q'), type:'mcq',   text, difficulty:diff, options:[clean(cols[3]),clean(cols[4]),clean(cols[5]),clean(cols[6])].map(t=>({text:t,imageUrl:''})), correct:Math.max(0,['A','B','C','D'].indexOf((clean(cols[7])||'A').toUpperCase())), explanation:clean(cols[8])||'' });
    else if (type==='match')                  questions.push({ id:uid('q'), type:'match', text, difficulty:diff, pairs:[{left:clean(cols[10]),leftImage:'',right:clean(cols[11]),rightImage:''},{left:clean(cols[12]),leftImage:'',right:clean(cols[13]),rightImage:''},{left:clean(cols[14]),leftImage:'',right:clean(cols[15]),rightImage:''},{left:clean(cols[16]),leftImage:'',right:clean(cols[17]),rightImage:''}], explanation:'' });
    else if (type==='label'||type==='image')  questions.push({ id:uid('q'), type:'label', text, difficulty:diff, imageUrl:clean(cols[9])||'', options:[clean(cols[3]),clean(cols[4]),clean(cols[5]),clean(cols[6])].map(t=>({text:t,imageUrl:''})), correct:Math.max(0,['A','B','C','D'].indexOf((clean(cols[7])||'A').toUpperCase())), explanation:clean(cols[8])||'' });
  }
  return questions;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared UI helpers
// ═══════════════════════════════════════════════════════════════════════════
function Toast({ msg }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg animate-in slide-in-from-top-2">
      <CheckCircle size={14}/>{msg}
    </div>
  );
}

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

// ─── Image Upload ──────────────────────────────────────────────────────────
function ImageUpload({ value, onChange, compact = false, label = 'Image' }) {
  const [drag, setDrag]           = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');

  const process = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    setError('');
    try {
      const { id, presignedUrl, url } = await api.getPresignedUrl(file.name, file.type);
      await api.uploadToS3(presignedUrl, file);
      await api.confirmUpload(id);
      onChange(url);
    } catch (err) {
      setError('Upload failed');
      console.error('Image upload failed:', err.message);
    } finally {
      setUploading(false);
    }
  };

  if (uploading) return (
    <div className={`flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-xl ${compact ? 'h-14' : 'h-24'}`}>
      <Loader2 size={compact ? 12 : 16} className="animate-spin text-indigo-500"/>
      <span className={`font-semibold text-indigo-500 ${compact ? 'text-[9px]' : 'text-xs'}`}>Uploading…</span>
    </div>
  );

  if (value) return (
    <div className="space-y-1">
      <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
        <img src={value} alt={label} className={`w-full object-cover ${compact ? 'h-16' : 'h-28'}`}/>
        <button onClick={() => onChange('')} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100"><X size={9}/></button>
      </div>
    </div>
  );

  return (
    <div className="space-y-1">
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-xl cursor-pointer transition-all ${drag ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'} ${compact ? 'h-14' : 'h-24'}`}>
        <Upload size={compact ? 13 : 18} className={drag ? 'text-indigo-500' : 'text-slate-300'}/>
        <p className={`font-semibold text-slate-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{compact ? 'Add Image' : 'Upload Image'}</p>
        <input type="file" accept="image/*" className="hidden" onChange={e => process(e.target.files[0])}/>
      </label>
      {error && <p className="text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Import Modal
// ═══════════════════════════════════════════════════════════════════════════
function ImportModal({ isOpen, onClose, levelName, categories, onImport }) {
  const [step,       setStep]       = useState('upload');
  const [parsed,     setParsed]     = useState([]);
  const [error,      setError]      = useState('');
  const [catId,      setCatId]      = useState(categories[0]?.id || '');
  const [newCatName, setNewCatName] = useState('');
  const [dragOver,   setDragOver]   = useState(false);
  const [importing,  setImporting]  = useState(false);

  const reset = () => { setStep('upload'); setParsed([]); setError(''); setCatId(categories[0]?.id || ''); setNewCatName(''); };

  const processFile = (f) => {
    if (!f) return;
    setError('');
    const isXlsx = f.name?.endsWith('.xlsx') || f.name?.endsWith('.xls');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let csvText;
        if (isXlsx) {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          csvText = XLSX.utils.sheet_to_csv(ws);
        } else {
          csvText = e.target.result;
        }
        const qs = parseCSV(csvText);
        if (!qs.length) { setError('No valid questions found. Ensure the file matches the template.'); return; }
        setParsed(qs); setStep('preview');
      } catch { setError('Could not parse file. Ensure it matches the template format.'); }
    };
    if (isXlsx) reader.readAsArrayBuffer(f);
    else reader.readAsText(f);
  };

  const downloadTemplate = () => {
    const headers = ['type','text','difficulty','opt_a','opt_b','opt_c','opt_d','correct','explanation','image_url(img only)','p1_left','p1_right','p2_left','p2_right','p3_left','p3_right','p4_left','p4_right'];
    const rows = [
      ['mcq','What is a servo motor?','easy','A DC motor with feedback control','A stepper motor','A linear actuator','An AC induction motor','A','Servo motors use encoders for closed-loop position control.','','','','','','','','',''],
      ['label','What component is shown?','medium','Servo motor','DC motor','Stepper motor','Solenoid','C','','https://example.com/component.jpg','','','','','','','',''],
      ['match','Match each component to its function','easy','','','','','','','','Sensor','Detects input signals','Motor','Converts electricity to motion','CPU','Processes instructions','Battery','Stores electrical energy'],
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{wch:10},{wch:50},{wch:10},{wch:30},{wch:22},{wch:22},{wch:22},{wch:8},{wch:46},{wch:36},{wch:18},{wch:22},{wch:18},{wch:22},{wch:18},{wch:22},{wch:18},{wch:22}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'question_bank_template.xlsx');
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(parsed, catId === '__new__' ? null : catId, catId === '__new__' ? newCatName.trim() || 'Imported' : null);
    } catch {}
    setImporting(false);
    setStep('done');
  };

  const typeLabel = (t) => Q_TYPES.find(q=>q.value===t)?.label || t;

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
                {importing?<><Loader2 size={14} className="animate-spin"/>Importing…</>:<><Upload size={14}/>Import {parsed.length} Questions</>}
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
              {[{type:'MCQ',cols:['type','text','difficulty','opt_a–opt_d','correct (A–D)']},{type:'Label',cols:['type=label','text','image_url','opt_a–opt_d','correct']},{type:'Match',cols:['type','text','difficulty','p1_left, p1_right','… (4 pairs)']}].map(f=>(
                <div key={f.type} className="bg-white rounded-xl p-3 border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 mb-2">{f.type}</p>
                  {f.cols.map(c=><p key={c} className="text-[10px] text-slate-500 font-mono">• {c}</p>)}
                </div>
              ))}
            </div>
            <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              <Download size={12}/> Download Excel Template (.xlsx)
            </button>
          </div>
          <label onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);processFile(e.dataTransfer.files[0]);}}
            className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragOver?'border-indigo-400 bg-indigo-50':'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
            <FileSpreadsheet size={36} className={`mx-auto mb-3 ${dragOver?'text-indigo-500':'text-slate-300'}`}/>
            <p className="text-sm font-semibold text-slate-600">Drop your Excel or CSV file here</p>
            <p className="text-xs text-slate-400 mt-1">or click to browse · .xlsx and .csv accepted</p>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>processFile(e.target.files[0])}/>
          </label>
          {error && <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600"><AlertCircle size={14}/>{error}</div>}
        </div>
      )}
      {step==='preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            {[{l:'Total',v:parsed.length,c:'bg-slate-100 text-slate-700'},{l:'MCQ',v:parsed.filter(q=>q.type==='mcq').length,c:'bg-blue-100 text-blue-700'},{l:'Match',v:parsed.filter(q=>q.type==='match').length,c:'bg-violet-100 text-violet-700'},{l:'Label',v:parsed.filter(q=>q.type==='label').length,c:'bg-rose-100 text-rose-700'}].map(s=>(
              <div key={s.l} className={`px-4 py-2 rounded-xl text-center ${s.c}`}><p className="text-lg font-bold">{s.v}</p><p className="text-[10px] font-semibold">{s.l}</p></div>
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
          <p className="text-sm text-slate-500">Added to <span className="font-semibold text-slate-700">{levelName}</span></p>
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Question Form Modal
// ═══════════════════════════════════════════════════════════════════════════
function QuestionFormModal({ isOpen, onClose, onSave, initial, levelName, catName, defaultAudience = 'student' }) {
  const initAF = initial?.applicableFor || defaultAudience || 'student';
  const [form, setForm]     = useState(() => initial
    ? { ...initial, options: initial.options?.map(normalizeOpt), pairs: initial.pairs?.map(normalizePair), applicableFor: initAF }
    : blankMcq(defaultAudience));
  const [errors, setErrors] = useState({});

  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setOpt  = (i, field, val) => setForm(p => { const opts = (Array.isArray(p.options)?p.options:[]).map(normalizeOpt); opts[i]={...opts[i],[field]:val}; return {...p,options:opts}; });
  const setPair = (i, side, val) => setForm(p => { const pairs=(p.pairs||[]).map(normalizePair); pairs[i]={...pairs[i],[side]:val}; return {...p,pairs}; });

  const handleTypeChange = (t) => { setForm(p => ({ ...blankForType(t, p.applicableFor || defaultAudience), id: p.id, difficulty: p.difficulty, text: p.text, imageUrl: p.imageUrl || '' })); setErrors({}); };

  const validate = () => {
    const e = {};
    if (!form.text.trim() && !form.imageUrl) e.text = 'Question text or image required';
    if (form.type === 'match') {
      (form.pairs || []).forEach((p, i) => { const pr=normalizePair(p); if ((!pr.left.trim()&&!pr.leftImage)||(!pr.right.trim()&&!pr.rightImage)) e[`pair${i}`]='Both sides need text or image'; });
    } else if (form.type === 'truefalse') {
      if (form.correct === null || form.correct === undefined) e.correct = 'Please select True or False';
    } else {
      (form.options||[]).forEach((o,i)=>{ const opt=normalizeOpt(o); if(!opt.text.trim()&&!opt.imageUrl) e[`opt${i}`]='Fill all options'; });
      if (form.correct === null || form.correct === undefined) e.correct = 'Please select the correct answer';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = () => { if (!validate()) return; onSave({ ...form, id: form.id || uid('q'), text: form.text.trim() }); };

  const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all';
  const lbl = 'text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={form.id ? 'Edit Question' : 'Add New Question'} size="lg"
      footer={<div className="flex gap-3 justify-end w-full">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
          <Save size={14}/>{form.id ? 'Save Changes' : 'Add Question'}
        </button>
      </div>}>
      <div className="space-y-5">
        {(levelName || catName) && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
            <Layers size={12}/>{levelName && <span className="font-semibold text-slate-600">{levelName}</span>}
            {levelName && catName && <ChevronRight size={10}/>}
            {catName && <span className="font-semibold text-slate-600">{catName}</span>}
          </div>
        )}
        <div>
          <label className={lbl}>Question Type</label>
          <div className="grid grid-cols-2 gap-2">
            {Q_TYPES.map(qt => { const Icon=qt.icon; return (
              <button key={qt.value} type="button" onClick={() => handleTypeChange(qt.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${form.type===qt.value?'border-indigo-500 bg-indigo-50':'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                <Icon size={16} className={`mb-1.5 ${form.type===qt.value?'text-indigo-600':'text-slate-400'}`}/>
                <p className={`text-xs font-bold ${form.type===qt.value?'text-indigo-700':'text-slate-700'}`}>{qt.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{qt.sub}</p>
              </button>
            );})}
          </div>
        </div>
        <div className="space-y-2">
          <label className={lbl}>Question Text <span className="text-slate-400 normal-case font-normal">(or image only)</span></label>
          <textarea rows={3} value={form.text} onChange={e => set('text', e.target.value)} placeholder="Type your question here…"
            className={`${inp} resize-none ${errors.text ? 'border-red-400' : ''}`}/>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-1"><Image size={11}/> Question Image <span className="font-normal">(optional)</span></div>
          <input type="url" value={form.imageUrl || ''} onChange={e => set('imageUrl', e.target.value)}
            placeholder="Paste image URL here…"
            className={`${inp} text-sm`}/>
          <p className="text-[10px] text-slate-400 text-center font-semibold">— or upload a file —</p>
          <ImageUpload value={form.imageUrl || ''} onChange={v => set('imageUrl', v)} />
          {errors.text && <p className="text-xs text-red-500">{errors.text}</p>}
        </div>
        {(form.type==='mcq'||form.type==='label') && (
          <div>
            <label className={lbl}>Answer Options <span className="text-red-400">*</span><span className="normal-case font-normal text-slate-400 ml-1">Click letter to mark correct</span></label>
            <div className="space-y-2">
              {(form.options||[]).map((opt,i)=>{ const optObj=normalizeOpt(opt); const correct=form.correct===i; return (
                <div key={i} className={`rounded-xl border-2 p-3 transition-all ${correct?'border-green-300 bg-green-50':errors[`opt${i}`]?'border-red-300':'border-slate-100 bg-slate-50/60'}`}>
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={()=>set('correct',i)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 transition-all ${correct?'bg-green-500 border-green-500 text-white':'border-slate-300 text-slate-400 hover:border-green-400'}`}>
                      {String.fromCharCode(65+i)}
                    </button>
                    <input value={optObj.text} onChange={e=>setOpt(i,'text',e.target.value)} placeholder={`Option ${String.fromCharCode(65+i)}…`}
                      className={`flex-1 bg-transparent outline-none text-sm placeholder-slate-300 ${correct?'text-green-800 font-semibold':'text-slate-700'}`}/>
                    {correct && <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 shrink-0"><Check size={10}/>Correct</span>}
                  </div>
                  {errors[`opt${i}`] && <p className="text-[10px] text-red-500 mt-1">{errors[`opt${i}`]}</p>}
                </div>
              );})}
            </div>
            {errors.correct && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.correct}</p>}
          </div>
        )}
        {form.type==='truefalse' && (
          <div>
            <label className={lbl}>Correct Answer <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {[{label:'True',idx:0,color:'emerald'},{label:'False',idx:1,color:'rose'}].map(({label,idx,color})=>{
                const selected=form.correct===idx;
                return (
                  <button key={label} type="button" onClick={()=>set('correct',idx)}
                    className={`py-6 rounded-2xl border-2 font-bold text-lg transition-all ${selected?(color==='emerald'?'border-emerald-500 bg-emerald-50 text-emerald-700':'border-rose-500 bg-rose-50 text-rose-700'):(errors.correct?'border-red-300 text-slate-500':'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50')}`}>
                    {selected && <Check size={16} className="mx-auto mb-1"/>}
                    {label}
                    {selected && <p className="text-[10px] font-semibold mt-1 opacity-70">Correct Answer</p>}
                  </button>
                );
              })}
            </div>
            {errors.correct && <p className="mt-2 flex items-center gap-1.5 text-xs text-red-500 font-semibold"><AlertCircle size={12}/>{errors.correct}</p>}
          </div>
        )}
        {form.type==='match' && (
          <div>
            <label className={lbl}>Match Pairs <span className="text-red-400">*</span></label>
            <div className="space-y-3">
              {(form.pairs||[]).map((pair,i)=>{ const pr=normalizePair(pair); return (
                <div key={i} className={`bg-slate-50 rounded-xl p-3 border-2 ${errors[`pair${i}`]?'border-red-300':'border-slate-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{i+1}.</span>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Pair {i+1}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Left Side</p>
                      <input value={pr.left} onChange={e=>setPair(i,'left',e.target.value)} placeholder="Text…" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                      <ImageUpload value={pr.leftImage} onChange={v=>setPair(i,'leftImage',v)} compact/>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Right Side</p>
                      <input value={pr.right} onChange={e=>setPair(i,'right',e.target.value)} placeholder="Text…" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
                      <ImageUpload value={pr.rightImage} onChange={v=>setPair(i,'rightImage',v)} compact/>
                    </div>
                  </div>
                  {errors[`pair${i}`] && <p className="text-[10px] text-red-500 mt-1">{errors[`pair${i}`]}</p>}
                </div>
              );})}
            </div>
          </div>
        )}
        <div>
          <label className={lbl}>Difficulty</label>
          <div className="flex gap-2">
            {Object.entries(DIFF_CFG).map(([k,v])=>(
              <button key={k} type="button" onClick={()=>set('difficulty',k)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${form.difficulty===k?v.cls+' border-transparent':'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={lbl}>Applicable For <span className="text-red-400">*</span></label>
          <div className="flex gap-2">
            {Object.entries(AF_CFG).map(([k, v]) => {
              const AfIcon = v.icon;
              const active = (form.applicableFor || 'student') === k;
              return (
                <button key={k} type="button" onClick={() => set('applicableFor', k)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    active ? `${v.badge} ${v.border}` : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  <AfIcon size={12}/>{v.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={lbl}>Explanation <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <textarea rows={2} value={form.explanation||''} onChange={e=>set('explanation',e.target.value)} placeholder="Explain why this is the correct answer…"
            className={`${inp} resize-none`}/>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Question Row
// ═══════════════════════════════════════════════════════════════════════════
function QuestionRow({ q, index, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const typeConf = Q_TYPES.find(t=>t.value===q.type)||Q_TYPES[0];
  const TypeIcon = typeConf.icon;
  const diff = DIFF_CFG[q.difficulty] || DIFF_CFG.easy;
  return (
    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{index}</span>
        <button onClick={()=>setExpanded(p=>!p)} className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{q.text || '[Image question]'}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <TypeIcon size={11} className="text-slate-400"/>
            <span className="text-[10px] text-slate-400">{typeConf.label}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${diff.cls}`}>{diff.label}</span>
            {(() => { const af=q.applicableFor||'student'; const cfg=AF_CFG[af]||AF_CFG.student; const AfIcon=cfg.icon; return (
              <span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                <AfIcon size={9}/>{cfg.label}
              </span>
            ); })()}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={13}/></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
          <button onClick={()=>setExpanded(p=>!p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">{expanded?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-slate-50">
          {q.imageUrl && <img src={q.imageUrl} alt="" className="w-full max-h-40 object-cover rounded-xl border border-slate-100 mt-2"/>}
          {q.type==='match'?(
            <div className="space-y-1.5">
              {(q.pairs||[]).map((p,i)=>{ const pr=normalizePair(p); return (
                <div key={i} className="flex items-stretch gap-2 text-xs">
                  <div className="flex-1 bg-slate-50 rounded-lg p-2 text-slate-700 font-medium">{pr.leftImage&&<img src={pr.leftImage} alt="" className="w-full h-10 object-cover rounded-lg mb-1"/>}{pr.left||<span className="text-slate-400">—</span>}</div>
                  <span className="text-slate-400 font-bold self-center shrink-0">→</span>
                  <div className="flex-1 bg-green-50 rounded-lg p-2 text-green-700 font-medium">{pr.rightImage&&<img src={pr.rightImage} alt="" className="w-full h-10 object-cover rounded-lg mb-1"/>}{pr.right||<span className="text-green-400">—</span>}</div>
                </div>
              );})}
            </div>
          ):q.type==='truefalse'?(
            <div className="flex gap-2">
              {[{label:'True',idx:0},{label:'False',idx:1}].map(({label,idx})=>(
                <div key={label} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs border font-semibold ${idx===q.correct?'bg-green-50 border-green-200 text-green-800':'bg-slate-50 border-slate-100 text-slate-500'}`}>
                  {idx===q.correct&&<CheckCircle size={10} className="text-green-500"/>}{label}
                </div>
              ))}
            </div>
          ):(
            <div className="space-y-1.5">
              {(q.options||[]).map((opt,i)=>{ const o=normalizeOpt(opt); return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${i===q.correct?'bg-green-50 border-green-200 text-green-800 font-semibold':'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i===q.correct?'bg-green-500 text-white':'bg-slate-200 text-slate-500'}`}>{String.fromCharCode(65+i)}</span>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {o.imageUrl&&<img src={o.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"/>}
                    <span className="truncate">{o.text||(o.imageUrl?'[Image]':'—')}</span>
                  </div>
                  {i===q.correct&&<CheckCircle size={10} className="ml-auto text-green-500 shrink-0"/>}
                </div>
              );})}
            </div>
          )}
          {q.explanation && <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700"><span className="font-bold">Explanation: </span>{q.explanation}</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Category Section — loads questions from API by cat.id
// ═══════════════════════════════════════════════════════════════════════════
function CategorySection({ cat, levelId, levelName, bankId, pal, onRenamed, onDeleted, showToast }) {
  const [questions,  setQuestions]  = useState([]);
  const [loaded,     setLoaded]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [qModal,     setQModal]     = useState(null);
  const [deleteQ,    setDeleteQ]    = useState(null);
  const [renaming,   setRenaming]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getQuestionsByCategory(cat.id)
      .then(qs => { setQuestions(Array.isArray(qs) ? qs : []); setLoaded(true); })
      .catch(err => console.error('Load questions failed:', err.message))
      .finally(() => setLoading(false));
  }, [cat.id]);

  const handleAdd = async (q) => {
    try {
      const saved = await api.addQuestion({
        text:          q.text,
        type:          q.type,
        options:       flattenOptions(q.options),
        pairs:         flattenPairs(q.pairs),
        correctAnswer: q.correct,
        difficulty:    q.difficulty,
        imageUrl:      q.imageUrl || '',
        explanation:   q.explanation || '',
        applicableFor: q.applicableFor || 'student',
        qbCategoryId:  cat.id,
        qbLevelId:     levelId,
        levelId:       undefined,
        category:      getCatFromName(cat.name),
        bankName:      'Question Bank',
        status:        'active',
      });
      setQuestions(prev => [...prev, saved?.id ? { ...q, id: saved.id } : q]);
      setQModal(null);
      showToast?.('Question added!');
    } catch (err) { showToast?.(`Failed to add: ${err.message}`, 'red'); }
  };

  const handleEdit = async (updated) => {
    const original = questions.find(q => q.id === updated.id);
    setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
    setQModal(null);
    try {
      await api.updateQuestion(updated.id, {
        text: updated.text, type: updated.type,
        options: flattenOptions(updated.options), pairs: flattenPairs(updated.pairs),
        correctAnswer: updated.correct, difficulty: updated.difficulty,
        imageUrl: updated.imageUrl || '', explanation: updated.explanation || '',
        applicableFor: updated.applicableFor || 'student',
      });
      showToast?.('Question updated!');
    } catch (err) {
      if (original) setQuestions(prev => prev.map(q => q.id === updated.id ? original : q));
      showToast?.(`Failed to update: ${err.message}`, 'red');
    }
  };

  const handleDeleteQ = async () => {
    const toDelete = deleteQ;
    const original = [...questions];
    setQuestions(prev => prev.filter(q => q.id !== toDelete.id));
    setDeleteQ(null);
    try {
      await api.deleteQuestion(toDelete.id);
      showToast?.('Question deleted.');
    } catch (err) {
      setQuestions(original);
      showToast?.(`Failed to delete: ${err.message}`, 'red');
    }
  };

  const handleRename = async (name) => {
    try {
      await api.updateQbCategory(cat.id, { name });
      onRenamed?.(cat.id, name);
      setRenaming(false);
    } catch (err) { showToast?.(`Failed to rename: ${err.message}`, 'red'); }
  };

  const handleDeleteCat = async () => {
    setConfirmDel(false);
    try {
      await api.deleteQbCategory(cat.id);
      onDeleted?.(cat.id);
      showToast?.(`"${cat.name}" deleted.`);
    } catch (err) { showToast?.(`Failed to delete: ${err.message}`, 'red'); }
  };

  const qCount = questions.length;
  const visibleQuestions = questions;
  const visCount = qCount;

  return (
    <div className={`rounded-2xl border-2 ${pal.border} overflow-hidden`}>
      <div className={`flex items-center gap-3 px-4 py-3 ${pal.light}`}>
        <button onClick={()=>setCollapsed(p=>!p)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {collapsed?<Folder size={16} className={pal.text}/>:<FolderOpen size={16} className={pal.text}/>}
          {renaming?(
            <div className="flex-1" onClick={e=>e.stopPropagation()}>
              <InlineInput initial={cat.name} placeholder="Category name" onSave={handleRename} onCancel={()=>setRenaming(false)}/>
            </div>
          ):(
            <>
              <span className={`text-sm font-bold ${pal.text} truncate`}>{cat.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/70 ${pal.text} shrink-0`}>{qCount} {qCount===1?'question':'questions'}</span>
            </>
          )}
        </button>
        {!renaming && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={()=>setQModal('add')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border ${pal.border} ${pal.text} text-xs font-bold hover:opacity-80 transition-all shadow-sm`}>
              <Plus size={12}/>Add Question
            </button>
            <button onClick={()=>setRenaming(true)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors"><Edit2 size={13}/></button>
            <button onClick={()=>setConfirmDel(true)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13}/></button>
            <button onClick={()=>setCollapsed(p=>!p)} className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors">{collapsed?<ChevronDown size={13}/>:<ChevronUp size={13}/>}</button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-6"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
          ) : visCount === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <HelpCircle size={28} className="text-slate-300 mx-auto mb-2"/>
              <p className="text-sm font-semibold text-slate-400">No questions yet</p>
              <p className="text-xs text-slate-400 mt-0.5 mb-3">Add MCQ, Match, Label, or True/False questions</p>
              <button onClick={()=>setQModal('add')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
                <Plus size={12}/>Add First Question
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleQuestions.map((q,i)=>(
                <QuestionRow key={q.id} q={q} index={i+1} onEdit={()=>setQModal(q)} onDelete={()=>setDeleteQ(q)}/>
              ))}
              <button onClick={()=>setQModal('add')} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all">
                <Plus size={13}/>Add Another Question
              </button>
            </div>
          )}
        </div>
      )}

      {qModal !== null && (
        <QuestionFormModal isOpen onClose={()=>setQModal(null)}
          onSave={qModal==='add' ? handleAdd : handleEdit}
          initial={qModal==='add' ? null : qModal}
          levelName={levelName} catName={cat.name}
          defaultAudience="student"/>
      )}
      <DeleteModal isOpen={!!deleteQ} onClose={()=>setDeleteQ(null)} onConfirm={handleDeleteQ}
        title="Delete Question?" message={`"${deleteQ?.text||'This question'}" will be permanently removed.`}/>
      <DeleteModal isOpen={confirmDel} onClose={()=>setConfirmDel(false)} onConfirm={handleDeleteCat}
        title={`Delete "${cat.name}"?`} message={`All ${qCount} questions in this category will be permanently deleted.`}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Level Section — loads categories from API, manages them via CRUD
// ═══════════════════════════════════════════════════════════════════════════
function LevelSection({ level, bankId, index, onRenamed, onDeleted, showToast }) {
  const pal = levelPal(index);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [collapsed,   setCollapsed]   = useState(false);
  const [addingCat,   setAddingCat]   = useState(false);
  const [renaming,    setRenaming]    = useState(false);
  const [confirmDel,  setConfirmDel]  = useState(false);
  const [importOpen,  setImportOpen]  = useState(false);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    api.getQbCategories(level.id)
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(err => console.error('Load categories failed:', err.message))
      .finally(() => setLoading(false));
  }, [level.id]);

  const handleAddCategory = async (name) => {
    setSaving(true);
    try {
      const newCat = await api.createQbCategory({ levelId: level.id, bankId, name });
      setCategories(prev => [...prev, newCat]);
      setAddingCat(false);
      showToast?.('Category added!');
    } catch (err) {
      showToast?.(`Failed to add category: ${err.message}`, 'red');
    } finally { setSaving(false); }
  };

  const handleRenameLevel = async (name) => {
    try {
      await api.updateQbLevel(level.id, { name });
      onRenamed?.(level.id, name);
      setRenaming(false);
    } catch (err) { showToast?.(`Failed to rename: ${err.message}`, 'red'); }
  };

  const handleDeleteLevel = async () => {
    setConfirmDel(false);
    try {
      await api.deleteQbLevel(level.id);
      onDeleted?.(level.id);
      showToast?.(`${level.name} deleted.`);
    } catch (err) { showToast?.(`Failed to delete: ${err.message}`, 'red'); }
  };

  const handleImport = async (questions, catId, newCatName) => {
    let targetCatId = catId;

    if (!catId && newCatName) {
      try {
        const newCat = await api.createQbCategory({ levelId: level.id, bankId, name: newCatName });
        targetCatId = newCat.id;
        setCategories(prev => [...prev, newCat]);
      } catch (err) {
        showToast?.(`Failed to create category: ${err.message}`, 'red');
        return;
      }
    }

    // Deduplicate within the imported batch by question text (case-insensitive)
    const seen = new Set();
    const unique = questions.filter(q => {
      const key = q.text.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const targetCatName = categories.find(c => c.id == targetCatId)?.name || newCatName || '';
    let count = 0;
    let skipped = 0;
    for (const q of unique) {
      try {
        await api.addQuestion({
          text: q.text, type: q.type,
          options: flattenOptions(q.options), pairs: flattenPairs(q.pairs),
          correctAnswer: q.correct, difficulty: q.difficulty,
          imageUrl: q.imageUrl || '', explanation: q.explanation || '',
          applicableFor: q.applicableFor || 'student',
          qbCategoryId: targetCatId, qbLevelId: level.id,
          levelId: undefined,
          category: getCatFromName(targetCatName),
          bankName: 'Question Bank', status: 'active',
        });
        count++;
      } catch { skipped++; }
    }
    const msg = skipped > 0
      ? `${count} imported, ${skipped} skipped (duplicates).`
      : `${count} question${count !== 1 ? 's' : ''} imported!`;
    showToast?.(msg);
    setImportOpen(false);
  };

  const totalQs = categories.reduce((s, c) => s + (c.questionCount || 0), 0);

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      <div className={`bg-gradient-to-r ${pal.bg} px-5 py-4`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Layers size={16} className="text-white"/></div>
          <div className="flex-1 min-w-0">
            {renaming ? (
              <div onClick={e=>e.stopPropagation()}>
                <InlineInput initial={level.name} placeholder="Level name" onSave={handleRenameLevel} onCancel={()=>setRenaming(false)}/>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-white font-bold text-base" style={{fontFamily:'Space Grotesk'}}>{level.name}</h3>
                <span className="text-white/70 text-xs font-semibold">
                  {loading ? '…' : `${categories.length} ${categories.length===1?'category':'categories'}`}
                </span>
              </div>
            )}
          </div>
          {!renaming && (
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
              <button onClick={()=>setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/30">
                <Upload size={12}/>Import Excel
              </button>
              <button onClick={()=>setAddingCat(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all">
                <Plus size={13}/>Add Category
              </button>
              <button onClick={()=>setRenaming(true)} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white/80 hover:text-white transition-all"><Edit2 size={13}/></button>
              <button onClick={()=>setConfirmDel(true)} className="p-1.5 rounded-xl bg-white/15 hover:bg-red-400/50 text-white/80 hover:text-white transition-all"><Trash2 size={13}/></button>
              <button onClick={()=>setCollapsed(p=>!p)} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all">{collapsed?<ChevronDown size={15}/>:<ChevronUp size={15}/>}</button>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className={`${pal.light} px-5 py-4 space-y-3`}>
          {addingCat && (
            <div className={`bg-white rounded-2xl border-2 ${pal.border} p-4`}>
              <p className={`text-xs font-bold ${pal.text} mb-2`}>New Category Name</p>
              {saving ? (
                <div className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin"/>Creating…</div>
              ) : (
                <InlineInput placeholder="e.g. Basics, Advanced Concepts…" onSave={handleAddCategory} onCancel={()=>setAddingCat(false)}/>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300"/></div>
          ) : categories.length === 0 && !addingCat ? (
            <div className="text-center py-10 bg-white/70 rounded-2xl border-2 border-dashed border-white">
              <Tag size={28} className={`${pal.text} mx-auto mb-2 opacity-40`}/>
              <p className={`text-sm font-semibold ${pal.text} opacity-60`}>No categories yet</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">Create categories to organise your questions</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={()=>setAddingCat(true)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r ${pal.bg}`}><Plus size={12}/>Add Category</button>
                <button onClick={()=>setImportOpen(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50"><Upload size={12}/>Import Excel</button>
              </div>
            </div>
          ) : (
            categories.map(cat => (
              <CategorySection
                key={cat.id} cat={cat}
                levelId={level.id} levelName={level.name} bankId={bankId}
                pal={pal}
                onRenamed={(catId, name) => setCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c))}
                onDeleted={(catId) => setCategories(prev => prev.filter(c => c.id !== catId))}
                showToast={showToast}
              />
            ))
          )}

          {categories.length > 0 && !addingCat && (
            <button onClick={()=>setAddingCat(true)} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border-2 border-dashed border-white text-xs font-semibold ${pal.text} opacity-70 hover:opacity-100 hover:bg-white/50 transition-all`}>
              <Plus size={13}/>Add Category
            </button>
          )}
        </div>
      )}

      {importOpen && (
        <ImportModal isOpen levelName={level.name} categories={categories}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}/>
      )}
      <DeleteModal isOpen={confirmDel} onClose={()=>setConfirmDel(false)} onConfirm={handleDeleteLevel}
        title={`Delete ${level.name}?`}
        message={`"${level.name}" and all its ${categories.length} categories will be permanently deleted.`}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Bank Detail — loads levels for this bank
// ═══════════════════════════════════════════════════════════════════════════
function BankDetail({ bank, bankIndex, onBack, onBankRenamed, showToast }) {
  const [levels,       setLevels]      = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [addingLevel,  setAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName]= useState('');
  const [renamingBank, setRenamingBank]= useState(false);
  const [saving,       setSaving]      = useState(false);
  const pal = bankPal(bankIndex);

  useEffect(() => {
    api.getQbLevels(bank.id)
      .then(lvls => setLevels(Array.isArray(lvls) ? lvls : []))
      .catch(err => console.error('Load levels failed:', err.message))
      .finally(() => setLoading(false));
  }, [bank.id]);

  const handleAddLevel = async () => {
    const name = newLevelName.trim() || `Level ${levels.length + 1}`;
    setSaving(true);
    try {
      const newLevel = await api.createQbLevel({ bankId: bank.id, name });
      setLevels(prev => [...prev, newLevel]);
      setNewLevelName('');
      setAddingLevel(false);
      showToast?.('Level added!');
    } catch (err) {
      showToast?.(`Failed: ${err.message}`, 'red');
    } finally { setSaving(false); }
  };

  const handleRenameBank = async (name) => {
    try {
      await api.updateQuestionBank(bank.id, { name });
      onBankRenamed?.(bank.id, name);
      setRenamingBank(false);
    } catch (err) { showToast?.(`Failed: ${err.message}`, 'red'); }
  };

  const totalCats = levels.length; // approximate
  const pal2 = bankPal(bankIndex);

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
              <InlineInput initial={bank.name} placeholder="Bank name" onSave={handleRenameBank} onCancel={()=>setRenamingBank(false)}/>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${pal2.grad}`}><Database size={14} className="text-white"/></div>
              <h1 className="text-2xl font-bold text-slate-800" style={{fontFamily:'Space Grotesk'}}>{bank.name}</h1>
              <button onClick={()=>setRenamingBank(true)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Edit2 size={14}/></button>
            </div>
          )}
          <p className="text-sm text-slate-400 mt-1 ml-10">
            <span className="font-semibold text-slate-600">{levels.length}</span> levels
          </p>
        </div>
        <button onClick={()=>setAddingLevel(true)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-all bg-gradient-to-r ${pal2.grad}`}>
          <Plus size={16}/>Add Level
        </button>
      </div>

      {addingLevel && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 shadow-sm">
          <p className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2"><Layers size={15}/>New Level</p>
          {saving ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin"/>Creating…</div>
          ) : (
            <div className="space-y-3">
              <input autoFocus value={newLevelName} onChange={e=>setNewLevelName(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleAddLevel(); if(e.key==='Escape'){setAddingLevel(false);setNewLevelName('');} }}
                placeholder={`e.g. Level ${levels.length + 1}, Advanced…`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
              <div className="flex items-center gap-2">
                <button onClick={handleAddLevel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-blue-600 hover:opacity-90 transition-all">
                  <Plus size={12}/>Add Level
                </button>
                <button onClick={()=>{setAddingLevel(false);setNewLevelName('');}} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-300"/></div>
      ) : levels.length === 0 && !addingLevel ? (
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
          {levels.map((level, idx) => (
            <LevelSection key={level.id} level={level} bankId={bank.id} index={idx}
              onRenamed={(levelId, name) => setLevels(prev => prev.map(l => l.id === levelId ? { ...l, name } : l))}
              onDeleted={(levelId) => setLevels(prev => prev.filter(l => l.id !== levelId))}
              showToast={showToast}/>
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
  const [creatingName, setCreatingName] = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuOpen,     setMenuOpen]     = useState(null);
  const [renamingId,   setRenamingId]   = useState(null);
  const [creating,     setCreating]     = useState(false);

  const handleCreate = async () => {
    const name = creatingName.trim() || `Question Bank ${banks.length + 1}`;
    setCreating(true);
    try {
      await onCreate(name);
      setCreatingName('');
      setShowCreate(false);
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{fontFamily:'Space Grotesk'}}>Question Banks</h1>
          <p className="text-sm text-slate-400 mt-0.5">{banks.length} {banks.length===1?'bank':'banks'}</p>
        </div>
        <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-all" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
          <Plus size={15}/>New Question Bank
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-5 shadow-sm">
          <p className="text-sm font-bold text-indigo-700 mb-3 flex items-center gap-2"><Database size={15}/>New Question Bank</p>
          {creating ? (
            <div className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin"/>Creating…</div>
          ) : (
            <div className="flex gap-2">
              <input autoFocus value={creatingName} onChange={e=>setCreatingName(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') handleCreate(); if(e.key==='Escape'){setShowCreate(false);setCreatingName('');} }}
                placeholder="e.g. Robotics Bank, Science Quiz…"
                className="flex-1 px-3 py-2 rounded-xl border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
              <button onClick={handleCreate} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">Create</button>
              <button onClick={()=>{setShowCreate(false);setCreatingName('');}} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          )}
        </div>
      )}

      {banks.length === 0 && !showCreate ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Database size={36} className="text-slate-300 mx-auto mb-3"/>
          <p className="font-semibold text-slate-400">No question banks yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Create a bank to start adding questions</p>
          <button onClick={()=>setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)'}}>
            <Plus size={15}/>Create First Bank
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank, idx) => {
            const pal = bankPal(idx);
            return (
              <div key={bank.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                <div className={`h-2 bg-gradient-to-r ${pal.grad}`}/>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${pal.grad}`}><Database size={15} className="text-white"/></div>
                      {renamingId === bank.id ? (
                        <div onClick={e=>e.stopPropagation()} className="flex-1 min-w-0">
                          <InlineInput initial={bank.name} placeholder="Bank name"
                            onSave={name=>{onRename(bank.id,name);setRenamingId(null);}}
                            onCancel={()=>setRenamingId(null)}/>
                        </div>
                      ) : (
                        <h3 className="font-bold text-slate-800 truncate" style={{fontFamily:'Space Grotesk'}}>{bank.name}</h3>
                      )}
                    </div>
                    <div className="relative shrink-0">
                      <button onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===bank.id?null:bank.id);}} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><MoreVertical size={14}/></button>
                      {menuOpen===bank.id && (
                        <div className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-slate-100 z-20 min-w-[130px] overflow-hidden" onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>{setRenamingId(bank.id);setMenuOpen(null);}} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            <Edit2 size={12}/>Rename
                          </button>
                          <button onClick={()=>{setDeleteTarget(bank);setMenuOpen(null);}} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                            <Trash2 size={12}/>Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {bank.createdAt && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-4">
                      <Calendar size={10}/> Created {fmtDate(bank.createdAt)}
                    </p>
                  )}
                  <button onClick={()=>onSelect(bank,idx)} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${pal.grad} hover:opacity-90 transition-all`}>
                    <BookOpen size={14}/>Open Bank
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {menuOpen && <div className="fixed inset-0 z-10" onClick={()=>setMenuOpen(null)}/>}
      <DeleteModal isOpen={!!deleteTarget} onClose={()=>setDeleteTarget(null)}
        onConfirm={()=>{ onDelete(deleteTarget.id); setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.name}"?`}
        message="All levels, categories, and questions in this bank will be permanently deleted."/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Migration notice — one-time banner reminding admin to review Applicable For
// ═══════════════════════════════════════════════════════════════════════════
const NOTICE_KEY = 'rqa_af_notice_dismissed';

function MigrationNotice() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(NOTICE_KEY));
  if (!visible) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-800">Action required — review "Applicable For" on all questions</p>
        <p className="text-xs text-amber-700 mt-0.5">
          All existing questions have been set to <span className="font-semibold">Both</span> by default.
          Open each question, set the correct audience (Students Only / Trainers Only / Both), and save.
          Trainers will only receive questions tagged <span className="font-semibold">Trainers Only</span> or <span className="font-semibold">Both</span> during their quiz.
        </p>
      </div>
      <button
        onClick={() => { localStorage.setItem(NOTICE_KEY, '1'); setVisible(false); }}
        className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors text-xs font-semibold underline mt-0.5"
      >
        Dismiss
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════
export default function QuestionBankAdmin() {
  const [banks,        setBanks]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [selectedBank, setSelectedBank]= useState(null);
  const [selectedIdx,  setSelectedIdx] = useState(0);
  const [toast,        setToast]       = useState('');

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); }, []);

  useEffect(() => {
    api.getQuestionBanks()
      .then(data => setBanks(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateBank = async (name) => {
    const bank = await api.createQuestionBank({ name });
    setBanks(prev => [...prev, bank]);
    showToast('Question Bank created!');
  };

  const handleDeleteBank = async (id) => {
    await api.deleteQuestionBank(id);
    setBanks(prev => prev.filter(b => b.id !== id));
    if (selectedBank?.id === id) setSelectedBank(null);
    showToast('Bank deleted.');
  };

  const handleRenameBank = async (id, name) => {
    await api.updateQuestionBank(id, { name });
    setBanks(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    if (selectedBank?.id === id) setSelectedBank(s => ({ ...s, name }));
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-400"/>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">
      {toast && <Toast msg={toast}/>}

      {/* Migration notice — shown until dismissed, reminds admin to review Applicable For */}
      <MigrationNotice />

      {selectedBank ? (
        <BankDetail
          bank={selectedBank}
          bankIndex={selectedIdx}
          onBack={() => { setSelectedBank(null); scrollToTop(); }}
          onBankRenamed={handleRenameBank}
          showToast={showToast}/>
      ) : (
        <BanksOverview
          banks={banks}
          onCreate={handleCreateBank}
          onDelete={handleDeleteBank}
          onRename={handleRenameBank}
          onSelect={(bank, idx) => { setSelectedBank(bank); setSelectedIdx(idx); scrollToTop(); }}/>
      )}
    </div>
  );
}
